# Release Readiness Checklist

Snapshot date: 2026-02-16

## Current State

- [x] App builds successfully (`npm run build`)
- [x] Auth flow is implemented (sign in, sign up, magic link, password reset)
- [x] Core app areas are implemented: Dashboard, Finder, Growth Lab, Autopilot, Settings
- [x] AI calls are routed through `supabase/functions/ai-gateway`
- [x] Docs/config updated to use Supabase frontend env vars instead of frontend Gemini key

## Release Gates (Must Pass)

- [ ] Apply all Supabase migrations in `supabase/migrations` to the target project
- [ ] Deploy `ai-gateway` edge function
- [ ] Set Supabase Edge Function secret: `GEMINI_API_KEY`
- [ ] Confirm production frontend env vars are set:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] Run production smoke tests:
  - login + logout
  - create/update/delete lead
  - import leads (CSV + unstructured text)
  - AI finder returns results
  - Growth Lab generate/persist flow
  - Autopilot queue generate + complete action

## Quality Gaps (Recommended Before Release)

- [ ] Add automated tests (at least smoke-level integration checks)
- [ ] Add CI pipeline for build + lint + tests
- [ ] Trim JS bundle size (currently >500 kB warning in Vite build)

## Go / No-Go Rule

Go only after all "Release Gates" are checked.
