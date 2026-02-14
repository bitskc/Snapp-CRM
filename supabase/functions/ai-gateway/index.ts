import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Verify Authentication
        const authHeader = req.headers.get('Authorization')
        console.log('[Auth Debug] Authorization header present:', !!authHeader)

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('[Auth Error] No valid Authorization header provided')
            return new Response(JSON.stringify({ error: 'No authorization header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const token = authHeader.replace('Bearer ', '')

        // Basic token validation - check if it's a valid JWT format (3 parts separated by dots)
        const tokenParts = token.split('.')
        if (tokenParts.length !== 3) {
            console.error('[Auth Error] Invalid token format')
            return new Response(JSON.stringify({ error: 'Invalid token format' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        console.log('[Auth Debug] Token format valid, proceeding...')

        // 2. Parse Request Body
        const body = await req.json().catch(e => {
            console.error('Failed to parse request body:', e);
            return null;
        });

        if (!body || !body.action) {
            return new Response(JSON.stringify({ error: 'Action is required in request body' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const { action, payload } = body;
        console.log(`Action: ${action} called`)

        // 3. Initialize Gemini
        const apiKey = Deno.env.get('GEMINI_API_KEY')
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not set in Edge Function secrets')
        }
        const genAI = new GoogleGenerativeAI(apiKey)

        // 4. Dispatch Action
        let result;

        switch (action) {
            case 'find_leads': {
                const model = genAI.getGenerativeModel({
                    model: "gemini-3-flash-preview",
                    tools: [{ googleSearch: {} }]
                })
                const prompt = `Find business leads based on this request: "${payload.query}". 
        Return a JSON list of real companies found using Google Search.
        Include: companyName, location, website, description, contactName, phone, email, matchScore (0-100), and matchReason.`

                const response = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                })
                result = JSON.parse(response.response.text())
                break
            }

            case 'generate_content': {
                const model = genAI.getGenerativeModel({ model: payload.model || "gemini-3-flash-preview" })
                const response = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: payload.prompt }] }],
                    generationConfig: payload.config || {}
                })
                result = response.response.text()
                break
            }

            case 'analyze_lead': {
                const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" })
                const response = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: payload.prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                })
                result = JSON.parse(response.response.text())
                break
            }

            case 'parse_import': {
                const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" })
                const response = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: payload.prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                })
                result = JSON.parse(response.response.text())
                break
            }

            default:
                throw new Error(`Unknown action: ${action}`)
        }

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('AI Gateway Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
