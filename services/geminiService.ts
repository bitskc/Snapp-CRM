import { GoogleGenAI, Type } from "@google/genai";
import { Lead, LeadStatus, AppSettings, Product, LeadAIAnalysis } from '../types';

// Initialize the Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Uses Gemini with Google Search Grounding to find leads.
 */
export const findLeadsWithAI = async (query: string): Promise<Partial<Lead>[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Find business leads based on this request: "${query}". 
      You are a sales research assistant.
      Return a list of real companies found using Google Search.
      Try to find their location, potential contact info if publicly available, and a description of what they do.
      Do not make up data. If you can't find specific fields, leave them blank.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              companyName: { type: Type.STRING },
              location: { type: Type.STRING },
              website: { type: Type.STRING },
              description: { type: Type.STRING },
              contactName: { type: Type.STRING, description: "Name of a potential contact person if found" },
              phone: { type: Type.STRING },
              email: { type: Type.STRING },
            },
            required: ["companyName", "description"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];

    const rawLeads = JSON.parse(text);
    
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
  try {
    const productContext = relevantProducts.length > 0 
        ? `The lead is interested in: ${relevantProducts.map(p => `${p.name} (${p.description})`).join(', ')}.`
        : `No specific product selected, pitch the general company solution: ${settings.companyDescription}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
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
      `,
    });

    return response.text || "Could not generate script.";
  } catch (error) {
    console.error("Error generating script:", error);
    return "Error generating script.";
  }
};

/**
 * Generates a cold or follow-up email.
 */
export const generateEmail = async (lead: Lead, type: 'COLD' | 'FOLLOW_UP', settings: AppSettings, relevantProducts: Product[]): Promise<{subject: string, body: string}> => {
  try {
    const productContext = relevantProducts.length > 0 
        ? `Focus the email on these products: ${relevantProducts.map(p => `${p.name} - ${p.description}`).join('; ')}.`
        : `Focus on the general value proposition of ${settings.companyName}: ${settings.companyDescription}`;

    const prompt = type === 'COLD' 
      ? `Write a cold email to ${lead.companyName} from ${settings.companyName}.
         My Style: ${settings.aboutMe}
         Prospect Info: ${lead.description}
         ${productContext}
         Keep it short and value-focused.`
      : `Write a follow-up email to ${lead.contactName || lead.companyName} from ${settings.companyName}.
         My Style: ${settings.aboutMe}
         Previous context: ${lead.notes.map(n => n.content).join('. ')}.
         ${productContext}
         Goal: Get a meeting.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt + " Return JSON with 'subject' and 'body' fields.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING }
          }
        }
      }
    });

    const json = JSON.parse(response.text || "{}");
    return { subject: json.subject || "Introduction", body: json.body || "Hi there," };
  } catch (error) {
    console.error("Error generating email:", error);
    return { subject: "Error", body: "Could not generate email." };
  }
};

/**
 * Generates a product description.
 */
export const generateProductDescription = async (productName: string, companyDesc: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Write a concise, compelling 1-sentence sales description for a product named "${productName}".
            The company is: "${companyDesc}".
            Focus on benefits.`
        });
        return response.text || "";
    } catch (e) {
        return "";
    }
};

/**
 * Analyzes the lead and provides a score, reasoning, and next action.
 */
export const analyzeLead = async (lead: Lead, settings: AppSettings): Promise<LeadAIAnalysis> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Analyze this sales lead compatibility for my company.
            
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
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.INTEGER },
                        reasoning: { type: Type.STRING },
                        nextAction: { type: Type.STRING }
                    }
                }
            }
        });

        const json = JSON.parse(response.text || "{}");
        return {
            score: json.score || 0,
            reasoning: json.reasoning || "Insufficient data to analyze.",
            nextAction: json.nextAction || "Gather more information.",
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error("Error analyzing lead:", error);
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
    try {
        const productContext = relevantProducts.length > 0 
            ? `Relevant Products: ${relevantProducts.map(p => `${p.name} (${p.description})`).join(', ')}.`
            : `Company Solution: ${settings.companyDescription}`;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `
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
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, enum: ["EMAIL", "SCRIPT"] },
                        subject: { type: Type.STRING },
                        content: { type: Type.STRING }
                    }
                }
            }
        });

        const json = JSON.parse(response.text || "{}");
        
        return {
            type: (json.type || "SCRIPT").toLowerCase() as 'email' | 'script',
            content: json.content || "Could not generate content.",
            subject: json.subject
        };

    } catch (error) {
        console.error("Error executing prescription:", error);
        return {
            type: 'script',
            content: "Error generating action content."
        };
    }
}