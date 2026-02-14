import { supabase } from './supabaseClient';
import { Lead, AppSettings, Product, LeadAIAnalysis } from '../types';

/**
 * Helper to call the secure AI Gateway Edge Function.
 */
const callGateway = async (action: string, payload: any) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    // Refresh session to ensure we have a valid token
    const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();

    if (sessionError || !session) {
      throw new Error('Session expired. Please sign in again.');
    }

    const { data, error } = await supabase.functions.invoke('ai-gateway', {
      body: { action, payload },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (error) {
      console.error(`AI Gateway Error (${action}):`, error);
      // Attempt to parse error message from response if available
      throw new Error(error.message || `Failed to execute ${action}`);
    }

    return data.data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('AI request timed out after 60 seconds');
    }
    throw err;
  }
};

/**
 * Uses Gemini via secure gateway to find leads.
 */
export const findLeadsWithAI = async (query: string): Promise<Partial<Lead>[]> => {
  try {
    const rawLeads = await callGateway('find_leads', { query });

    // Map to our internal Lead type structure
    return rawLeads.map((l: any) => ({
      ...l,
      id: Math.random().toString(36).substr(2, 9),
      status: 'COLD',
      source: 'AI_FINDER',
      notes: [],
      productIds: [],
      createdAt: new Date().toISOString(),
    }));

  } catch (error) {
    console.error("Error finding leads:", error);
    throw error;
  }
};

/**
 * Generates a sales script based on the lead's data.
 */
export const generateCallScript = async (lead: Lead, settings: AppSettings, relevantProducts: Product[]): Promise<string> => {
  const productContext = relevantProducts.length > 0
    ? `The lead is interested in: ${relevantProducts.map(p => `${p.name} (${p.description})`).join(', ')}.`
    : `No specific product selected, pitch the general company solution: ${settings.companyDescription}`;

  const prompt = `
        You are a sales representative for "${settings.companyName}".
        Company Description: ${settings.companyDescription}
        Your Persona/Style: ${settings.aboutMe}
        
        Create a call script for the following prospect:
        Prospect: ${lead.companyName}
        Contact: ${lead.contactName || 'The Owner/Manager'}
        Location: ${lead.location || 'Unknown'}
        Prospect Description: ${lead.description || 'N/A'}
        Status: ${lead.status}
        Past Interaction Notes: ${lead.notes.map(n => n.content).join('; ')}
        
        ${productContext}

        The script should be natural and address potential pain points based on their description and your products.
        Include objection handling.
        Format with Markdown.
      `;

  return await callGateway('generate_content', {
    prompt,
    model: "gemini-3-flash-preview"
  }) || "Could not generate script.";
};

/**
 * Generates a cold or follow-up email.
 */
export const generateEmail = async (lead: Lead, type: 'COLD' | 'FOLLOW_UP', settings: AppSettings, relevantProducts: Product[]): Promise<{ subject: string, body: string }> => {
  const productContext = relevantProducts.length > 0
    ? `Focus the email on these products: ${relevantProducts.map(p => `${p.name} - ${p.description}`).join('; ')}.`
    : `Focus on the general value proposition of ${settings.companyName}: ${settings.companyDescription}`;

  const prompt = type === 'COLD'
    ? `Write a cold email to ${lead.companyName} from ${settings.companyName}.
         My Style: ${settings.aboutMe}
         Prospect Info: ${lead.description}
         ${productContext}
         Keep it short and value-focused.
         Return JSON: { "subject": "...", "body": "..." }`
    : `Write a follow-up email to ${lead.contactName || lead.companyName} from ${settings.companyName}.
         My Style: ${settings.aboutMe}
         Previous context: ${lead.notes.map(n => n.content).join('. ')}.
         ${productContext}
         Goal: Get a meeting.
         Return JSON: { "subject": "...", "body": "..." }`;

  const result = await callGateway('generate_content', {
    prompt,
    model: "gemini-3-flash-preview",
    config: { responseMimeType: "application/json" }
  });

  try {
    const json = typeof result === 'string' ? JSON.parse(result) : result;
    return { subject: json.subject || "Introduction", body: json.body || "Hi there," };
  } catch (e) {
    return { subject: "Error", body: "Could not parse AI response." };
  }
};

/**
 * Generates a product description.
 */
export const generateProductDescription = async (productName: string, companyDesc: string): Promise<string> => {
  const prompt = `Write a concise, compelling 1-sentence sales description for a product named "${productName}".
            The company is: "${companyDesc}".
            Focus on benefits.`;

  return await callGateway('generate_content', { prompt, model: "gemini-3-flash-preview" }) || "";
};

/**
 * Analyzes the lead and provides a score, reasoning, and next action.
 */
export const analyzeLead = async (lead: Lead, settings: AppSettings): Promise<LeadAIAnalysis> => {
  const prompt = `Analyze this sales lead compatibility for my company.
            
            My Company: ${settings.companyName}
            My Description: ${settings.companyDescription}
            
            The Lead:
            Company: ${lead.companyName}
            Description: ${lead.description}
            Location: ${lead.location}
            Current Status: ${lead.status}
            History: ${lead.notes.map(n => n.content).join('. ')}
            
            Provide a JSON response with:
            1. score (integer 0-100): How likely are they to buy?
            2. reasoning (string): Why this score?
            3. nextAction (string): The single most effective thing I should do next.
            `;

  try {
    const json = await callGateway('analyze_lead', { prompt });
    return {
      score: json.score || 0,
      reasoning: json.reasoning || "Insufficient data to analyze.",
      nextAction: json.nextAction || "Gather more information.",
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    return {
      score: 0,
      reasoning: "Error analyzing lead.",
      nextAction: "Try again later.",
      lastUpdated: new Date().toISOString()
    };
  }
};

/**
 * Executes the prescribed action by generating appropriate content.
 */
export const executePrescription = async (
  lead: Lead,
  settings: AppSettings,
  relevantProducts: Product[],
  nextAction: string,
  userInstructions: string
): Promise<{ type: 'email' | 'script', content: string, subject?: string }> => {
  const productContext = relevantProducts.length > 0
    ? `Relevant Products: ${relevantProducts.map(p => `${p.name} (${p.description})`).join(', ')}.`
    : `Company Solution: ${settings.companyDescription}`;

  const prompt = `
                Context:
                My Company: ${settings.companyName}
                My Style: ${settings.aboutMe}
                Lead: ${lead.companyName} (${lead.description})
                History: ${lead.notes.map(n => n.content).join('. ')}
                ${productContext}
                
                Prescribed Next Action: "${nextAction}"
                User Instructions: "${userInstructions}"
                
                Task: Generate the specific content needed to execute this action.
                1. Determine if this action requires an EMAIL (e.g. follow up, intro) or a CALL SCRIPT (e.g. phone call).
                2. Write the content (Subject/Body for email, Dialogue for script).
                
                Return JSON:
                {
                  "type": "EMAIL" | "SCRIPT",
                  "subject": "string (only if email)",
                  "content": "string (the email body or the script formatted in markdown)"
                }
            `;

  try {
    const json = await callGateway('generate_content', {
      prompt,
      model: "gemini-3-flash-preview",
      config: { responseMimeType: "application/json" }
    });

    const parsed = typeof json === 'string' ? JSON.parse(json) : json;

    return {
      type: (parsed.type || "SCRIPT").toLowerCase() as 'email' | 'script',
      content: parsed.content || "Could not generate content.",
      subject: parsed.subject
    };

  } catch (error) {
    return {
      type: 'script',
      content: "Error generating action content."
    };
  }
}

/**
 * Parses raw text/CSV data into structured leads.
 */
export const parseImportData = async (rawData: string): Promise<Partial<Lead>[]> => {
  const prompt = `
        Analyze the following raw text data which may be CSV, pasted spreadsheet rows, or unstructured text.
        Extract a list of business leads from it.
        
        Raw Data:
        """
        ${rawData.substring(0, 10000)} 
        """
        
        Map the data into these fields:
        - companyName (required, use "Unknown" if missing)
        - contactName
        - email
        - phone
        - website
        - location (city/state or address)
        - description (what they do)
        
        Return a JSON array of objects.
      `;

  try {
    return await callGateway('parse_import', { prompt });
  } catch (error) {
    console.error("Error parsing import data:", error);
    throw error;
  }
};

/**
 * Generates social media posts.
 */
export const generateSocialPost = async (
  lead: Lead,
  platform: 'LINKEDIN' | 'TWITTER' | 'FACEBOOK' | 'YOUTUBE' | 'TIKTOK',
  settings: AppSettings
): Promise<{ content: string, rationale: string }> => {
  const prompt = `
            You are a social media manager for "${settings.companyName}".
            Company Desc: ${settings.companyDescription}
            
            Create a ${platform} post targeting the following prospect:
            Prospect: ${lead.companyName}
            Info: ${lead.description}
            Location: ${lead.location}
            
            The goal is to get their attention or showcase how we help companies like them.
            Adopt the tone appropriate for ${platform}.
            
            Return JSON:
            {
              "content": "The post text (include hashtags)",
              "rationale": "Why this platform and tone works for this lead"
            }
          `;

  try {
    const json = await callGateway('generate_content', {
      prompt,
      model: "gemini-3-flash-preview",
      config: { responseMimeType: "application/json" }
    });

    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    return {
      content: parsed.content || "Error generating post.",
      rationale: parsed.rationale || ""
    };
  } catch (error) {
    return { content: "Error generating post.", rationale: "" };
  }
}
