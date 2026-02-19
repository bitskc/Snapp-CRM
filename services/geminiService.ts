import { supabase } from './supabaseClient';
import { Lead, AppSettings, Product, LeadAIAnalysis, GrowthSettings, GrowthConcept, GrowthPost, EngagementOpportunity, AutopilotAction } from '../types';
import { CompactLeadSummary } from '../utils/autopilotHelpers';

/**
 * Helper to call the secure AI Gateway Edge Function.
 */
const callGateway = async (action: string, payload: any) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    // Refresh session to ensure the client has a valid, non-expired token
    const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();

    if (sessionError || !session) {
      throw new Error('Session expired. Please sign in again.');
    }

    const { data, error } = await supabase.functions.invoke('ai-gateway', {
      body: { action, payload },
      signal: controller.signal,
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
 * Normalizes a single lead object from AI response, handling both
 * camelCase and snake_case field names.
 */
const normalizeLead = (raw: any): Partial<Lead> | null => {
  if (!raw || typeof raw !== 'object') return null;

  const companyName = raw.companyName || raw.company_name || raw.name || raw.company
    || raw.business || raw.businessName || raw.business_name || raw.organization
    || raw.company_title || raw.title || 'Unknown Company';

  // Build location from granular address parts, falling back to existing location field
  const addressParts = [
    raw.address,
    raw.city,
    raw.stateProvince || raw.state_province || raw.state,
    raw.postalCode || raw.postal_code || raw.zip,
    raw.country,
  ].filter(Boolean);
  const location = raw.location || (addressParts.length > 0 ? addressParts.join(', ') : undefined);

  // Build description, combining description/pitch/source
  let description = raw.description || raw.desc || raw.about || raw.info || '';
  const pitch = raw.pitch || raw.salesPitch || raw.sales_pitch;
  const source = raw.source;
  if (pitch) description += `${description ? '\n\n' : ''}Pitch: ${pitch}`;
  if (source) description += `${description ? '\n\n' : ''}Source: ${source}`;

  return {
    companyName,
    contactName: raw.contactName || raw.contact_name || raw.contact || undefined,
    email: raw.email || raw.email_address || undefined,
    phone: raw.phone || raw.phone_number || raw.telephone || undefined,
    website: raw.website || raw.url || raw.web || undefined,
    location: location || undefined,
    description: description || undefined,
    _notes: raw.notes || raw.note || raw.comments || undefined,
  } as Partial<Lead> & { _notes?: string };
};

/**
 * Extracts a lead array from an AI response that may be a direct array
 * or wrapped in an object (e.g. { "leads": [...] }).
 */
const extractLeadArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;

  if (data && typeof data === 'object') {
    for (const key of ['leads', 'data', 'results', 'items', 'companies']) {
      if (Array.isArray(data[key])) return data[key];
    }
    if (data.companyName || data.company_name || data.name) {
      return [data];
    }
  }

  return [];
};

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

        Map the data into these fields using exactly these camelCase names:
        - companyName (required, use "Unknown" if missing)
        - contactName
        - email
        - phone
        - website
        - address
        - city
        - stateProvince
        - postalCode
        - country
        - description (what they do)
        - notes (any notes or comments)
        - pitch (sales pitch or approach)
        - source (where the lead came from)

        Return a JSON array of objects. Do NOT wrap in an outer object.
      `;

  try {
    const result = await callGateway('parse_import', { prompt });
    const rawLeads = extractLeadArray(result);
    return rawLeads
      .map(normalizeLead)
      .filter((lead): lead is Partial<Lead> => lead !== null);
  } catch (error) {
    console.error("Error parsing import data:", error);
    throw error;
  }
};

/**
 * Generates social media posts.
 */
export const generateSocialPost = async (
  product: Product,
  platform: 'LINKEDIN' | 'TWITTER' | 'FACEBOOK' | 'YOUTUBE' | 'TIKTOK',
  settings: AppSettings
): Promise<{ content: string, rationale: string }> => {
  const prompt = `
            You are a social media manager for "${settings.companyName}".
            Company Desc: ${settings.companyDescription}
            
            Create a ${platform} post showcasing the following product/service:
            Product: ${product.name}
            Description: ${product.description}
            
            The goal is to attract potential customers and showcase the value of this product/service.
            Adopt the tone appropriate for ${platform}.
            
            Return JSON:
            {
              "content": "The post text (include hashtags)",
              "rationale": "Why this platform and tone works for this product"
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

// --- Growth Lab Actions ---

/**
 * Suggests 3 strategic weekly theme options.
 */
export const generateWeeklyThemeOptions = async (settings: AppSettings): Promise<{ theme: string, goal: string, reasoning: string }[]> => {
  const prompt = `
    You are a Senior B2B SaaS Marketing Strategist. 
    Company Name: ${settings.companyName}
    Company Description: ${settings.companyDescription}
    Sales Persona: ${settings.aboutMe}

    Identify 3 potential 'Weekly Growth Themes' for this SaaS. 
    A theme should be a specific strategic angle like 'Solving Dispatch Chaos', 'The Hidden Cost of Manual Invoicing', or 'Automating the Field Service Follow-up'.

    Return a JSON array of objects:
    [{ "theme": "...", "goal": "...", "reasoning": "..." }]
  `;

  try {
    const result = await callGateway('generate_content', {
      prompt,
      model: "gemini-3-flash-preview",
      config: { responseMimeType: "application/json" }
    });
    return typeof result === 'string' ? JSON.parse(result) : result;
  } catch (error) {
    console.error("Error generating weekly theme:", error);
    return [];
  }
};

/**
 * Generates 4 daily sparks (hooks) aligned with a theme.
 */
export const generateDailySparks = async (currentTheme: string, settings: AppSettings): Promise<string[]> => {
  const prompt = `
    Active Theme: ${currentTheme}.
    Context: ${settings.companyDescription}.

    Generate 4 'Daily Sparks' - these are raw, high-intent marketing hooks or concepts.
    Rules:
    - Must align with the Active Theme.
    - Avoid generic 'buy our product' messaging.
    - Focus on pain points or counter-intuitive insights for the field service industry.

    Return a JSON array of strings: ["Spark 1", "Spark 2", "Spark 3", "Spark 4"]
  `;

  try {
    const result = await callGateway('generate_content', {
      prompt,
      model: "gemini-3-flash-preview",
      config: { responseMimeType: "application/json" }
    });
    return typeof result === 'string' ? JSON.parse(result) : result;
  } catch (error) {
    console.error("Error generating daily sparks:", error);
    return [];
  }
};

/**
 * Expands a concept into a platform-specific post.
 */
export const expandConceptToPost = async (
  conceptTitle: string,
  platform: 'LINKEDIN' | 'X',
  theme: string,
  settings: AppSettings
): Promise<string> => {
  const prompt = platform === 'LINKEDIN'
    ? `Concept: ${conceptTitle}.
       Theme: ${theme}.
       Company: ${settings.companyName}.
       My Style: ${settings.aboutMe}.

       Draft a high-impact LinkedIn post.
       Structure:
       - Strong hook (first line).
       - Narrative context or a short story.
       - 3 bullet points of value.
       - Call to value (not just 'click here').
       - 3 relevant hashtags.
       Return as Markdown text string.`
    : `Concept: ${conceptTitle}.
       Theme: ${theme}.
       Company: ${settings.companyName}.

       Draft a punchy X (Twitter) post (max 280 chars).
       Structure:
       - Question-based or controversial hook.
       - Singular value statement.
       - 2 hashtags.
       Return as Markdown text string.`;

  return await callGateway('generate_content', {
    prompt,
    model: "gemini-3-flash-preview"
  }) || "Could not generate post content.";
};

/**
 * Generates outreach search queries based on the theme.
 */
export const generateOutreachQueries = async (theme: string): Promise<{ platform: string, label: string, url: string }[]> => {
  const prompt = `
    Theme: ${theme}.

    Generate 3 search queries for 'The Pulse' outreach.
    Queries should target Reddit or X (Twitter) where users are complaining about the THEME's related pain point.

    Return JSON array of objects:
    [{ "platform": "Reddit" | "X", "label": "Short descriptive label", "url": "encoded search URL" }]
  `;

  try {
    const result = await callGateway('generate_content', {
      prompt,
      model: "gemini-3-flash-preview",
      config: { responseMimeType: "application/json" }
    });
    return typeof result === 'string' ? JSON.parse(result) : result;
  } catch (error) {
    console.error("Error generating outreach queries:", error);
    return [];
  }
};

/**
 * Generates value-first reply templates.
 */
export const generateReplyTemplates = async (opportunityLabel: string, theme: string): Promise<string[]> => {
  const prompt = `
    Opportunity Target: ${opportunityLabel}.
    Theme: ${theme}.

    Suggest 3 'Value-First' reply templates for this outreach opportunity.
    Rules:
    - NO PITCHING initially.
    - Mention a specific insight related to the theme.
    - Ask a follow-up question to start a conversation.
    - Sound like a helpful peer, not a bot.

    Return as JSON array of strings: ["Template 1", "Template 2", "Template 3"]
  `;

  try {
    const result = await callGateway('generate_content', {
      prompt,
      model: "gemini-3-flash-preview",
      config: { responseMimeType: "application/json" }
    });
    return typeof result === 'string' ? JSON.parse(result) : result;
  } catch (error) {
    console.error("Error generating reply templates:", error);
    return [];
  }
};

// --- Sales Autopilot ---

/**
 * Pass 1: Generates prioritized action stubs from compact lead summaries.
 */
export const generateActionQueue = async (
  summaries: CompactLeadSummary[],
  settings: AppSettings,
  products: Product[]
): Promise<Omit<AutopilotAction, 'id' | 'status' | 'content'>[]> => {
  const productList = products.map(p => `${p.name}: ${p.description}`).join('; ');
  const summaryBlock = summaries
    .map(s => `[${s.id}] ${s.companyName} | status:${s.status} | score:${s.matchScore} | days_stale:${s.daysSinceLastContact} | notes:${s.noteCount} | "${s.description}"`)
    .join('\n');

  const prompt = `
You are a senior sales manager for "${settings.companyName}".
Company: ${settings.companyDescription}
Products: ${productList || 'General services'}
Sales Style: ${settings.aboutMe}

Analyze these pipeline leads and create a prioritized daily action queue.
Each lead summary is: [id] company | status | match_score | days_since_last_contact | note_count | description

LEADS:
${summaryBlock}

RULES:
- Return 15-20 actions maximum
- Max 2 actions per lead
- Prioritize: leads never contacted > stale leads > high match scores
- Action types: "email" (cold/follow-up), "call" (phone outreach), "social" (LinkedIn/X engagement), "note" (internal check-in/research)
- Priority is 1-10 (10 = most urgent)
- Reasoning should be 1 concise sentence explaining WHY this action and WHY now

Return a JSON array:
[{ "leadId": "id", "leadName": "company name", "contactName": "optional", "email": "optional", "phone": "optional", "actionType": "email|call|social|note", "priority": 1-10, "reasoning": "..." }]
`;

  try {
    const result = await callGateway('generate_content', {
      prompt,
      model: "gemini-3-flash-preview",
      config: { responseMimeType: "application/json" }
    });
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error generating action queue:", error);
    throw error;
  }
};

/**
 * Pass 2: Generates full content for a single action on-demand.
 */
export const generateActionContent = async (
  lead: Lead,
  actionType: AutopilotAction['actionType'],
  settings: AppSettings,
  products: Product[]
): Promise<{ content: string; subject?: string }> => {
  const productContext = products.length > 0
    ? `Relevant products: ${products.map(p => `${p.name} (${p.description})`).join(', ')}`
    : `Company solution: ${settings.companyDescription}`;

  const noteHistory = lead.notes.length > 0
    ? lead.notes.slice(-5).map(n => n.content).join('; ')
    : 'No previous interactions';

  const prompts: Record<AutopilotAction['actionType'], string> = {
    email: `Write a sales email from "${settings.companyName}" to ${lead.contactName || 'the decision maker'} at ${lead.companyName}.
Style: ${settings.aboutMe}
Lead info: ${lead.description || 'N/A'}
${productContext}
Previous interactions: ${noteHistory}
${lead.notes.length === 0 ? 'This is a COLD email — first contact.' : 'This is a FOLLOW-UP email.'}
Return JSON: { "subject": "email subject", "content": "email body" }`,

    call: `Write a phone call script for calling ${lead.contactName || 'the decision maker'} at ${lead.companyName}.
Company: ${settings.companyName}
Style: ${settings.aboutMe}
Lead info: ${lead.description || 'N/A'}
${productContext}
Previous interactions: ${noteHistory}
Include: opener, value prop, objection handling, close.
Return JSON: { "content": "the full script in markdown" }`,

    social: `Write a LinkedIn or X post/message targeting ${lead.companyName}.
Company: ${settings.companyName}
Style: ${settings.aboutMe}
Lead info: ${lead.description || 'N/A'}
${productContext}
Goal: Start a conversation, not hard sell.
Return JSON: { "content": "the post or message text" }`,

    note: `Write a brief internal check-in note about ${lead.companyName} for the sales team.
Current status: ${lead.status}
Lead info: ${lead.description || 'N/A'}
Previous interactions: ${noteHistory}
Suggest next steps or research to do.
Return JSON: { "content": "the note text" }`
  };

  try {
    const result = await callGateway('generate_content', {
      prompt: prompts[actionType],
      model: "gemini-3-flash-preview",
      config: { responseMimeType: "application/json" }
    });
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    return {
      content: parsed.content || parsed.body || 'Could not generate content.',
      subject: parsed.subject
    };
  } catch (error) {
    console.error("Error generating action content:", error);
    throw error;
  }
};
