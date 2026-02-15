import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

function parseJsonResponse(text: string): unknown {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(cleaned)
}

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

        // Validate token with Supabase auth
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
        )
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) {
            console.error('[Auth Error] Token validation failed:', authError?.message)
            return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        console.log('[Auth Debug] Token valid for user:', user.id)

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
                result = parseJsonResponse(response.response.text())
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
                result = parseJsonResponse(response.response.text())
                break
            }

            case 'parse_import': {
                const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" })
                const response = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: payload.prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                })
                result = parseJsonResponse(response.response.text())
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
        return new Response(JSON.stringify({ error: 'Internal AI processing error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
