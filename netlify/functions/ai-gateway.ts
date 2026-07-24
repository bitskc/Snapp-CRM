import { GoogleGenerativeAI } from '@google/generative-ai';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function parseJsonResponse(text: string): unknown {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
}

export const handler = async (event: any, context: any) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { action, payload } = body;

        if (!action) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Action is required in request body' }),
            };
        }

        const apiKey = payload.customApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'No Gemini API Key provided. Please configure your Gemini API Key in Settings → BYOK LLM Keys.' }),
            };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        let result: any;

        switch (action) {
            case 'find_leads': {
                const model = genAI.getGenerativeModel({
                    model: 'gemini-2.5-flash',
                });
                const prompt = `Find business leads based on this request: "${payload.query}". 
        Return a JSON list of real companies found.
        Include: companyName, location, website, description, contactName, phone, email, matchScore (0-100), and matchReason.`;

                const response = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' },
                });
                result = parseJsonResponse(response.response.text());
                break;
            }

            case 'generate_content': {
                const model = genAI.getGenerativeModel({ model: payload.model || 'gemini-2.5-flash' });
                const response = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: payload.prompt }] }],
                    generationConfig: payload.config || {},
                });
                result = response.response.text();
                break;
            }

            case 'analyze_lead': {
                const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
                const response = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: payload.prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' },
                });
                result = parseJsonResponse(response.response.text());
                break;
            }

            case 'parse_import': {
                const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
                const response = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: payload.prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' },
                });
                result = parseJsonResponse(response.response.text());
                break;
            }

            default:
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: `Unknown action: ${action}` }),
                };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ data: result }),
        };
    } catch (err: any) {
        console.error('AI Gateway Error:', err);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: err.message || 'Internal AI processing error' }),
        };
    }
};
