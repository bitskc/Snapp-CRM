-- Migration 002: Add Slack integration settings columns
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS slack_notify_new_lead BOOLEAN DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS slack_notify_new_note BOOLEAN DEFAULT true;
