-- Migration 003: Add Bring Your Own Key (BYOK) LLM API Key columns
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS openai_api_key TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS anthropic_api_key TEXT;
