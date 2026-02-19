-- Add activity_date and activity_type columns to notes table
-- Run this in your Supabase SQL Editor or apply as a migration

ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS activity_date DATE;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS activity_type TEXT;

-- Optional: add index for activity date queries
CREATE INDEX IF NOT EXISTS idx_notes_activity_date ON public.notes(activity_date DESC);

COMMENT ON COLUMN public.notes.activity_date IS 'Date the activity occurred (defaults to today in the UI)';
COMMENT ON COLUMN public.notes.activity_type IS 'Type: call, email, text, in_person';
