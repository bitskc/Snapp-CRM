# Snapp-CRM

Snapp-CRM is a Supabase-backed CRM with AI-assisted lead finding, Growth Lab workflows, and Autopilot sales planning.

## Prerequisites

- Node.js 20+
- A Supabase project

## Local Development

1. Install dependencies:
   `npm install`
2. Create local env file:
   `cp .env.local.example .env.local`
3. Set these required frontend variables in `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Run the app:
   `npm run dev`

## Backend Setup (Required for AI Features)

AI actions run through the Supabase Edge Function `ai-gateway` (not directly from the browser).

1. Apply Supabase migrations in `supabase/migrations`.
2. Deploy the edge function:
   `npx supabase functions deploy ai-gateway`
3. Set Gemini secret on Supabase:
   `npx supabase secrets set GEMINI_API_KEY=your_actual_key`

Detailed deployment steps: `DEPLOYMENT_INSTRUCTIONS.md`

## Build

- Production build: `npm run build`
- Preview build: `npm run preview`
