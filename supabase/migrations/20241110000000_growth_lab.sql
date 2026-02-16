-- Migration: 20241110000000_growth_lab.sql
-- Description: Create tables for the Growth Lab marketing feature for ServiceSnapp B2B growth.

-- 1. Growth Settings (Weekly Theme & Goals)
CREATE TABLE IF NOT EXISTS public.growth_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_campaign_theme TEXT,
    theme_goal TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.growth_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own growth settings" 
ON public.growth_settings FOR ALL 
USING (auth.uid() = user_id);

-- 2. Growth Concepts (The Spark)
CREATE TABLE IF NOT EXISTS public.growth_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    theme_snapshot TEXT, -- Theme active when this idea was sparked
    status TEXT DEFAULT 'RAW', -- RAW, IGNITED, ARCHIVED
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.growth_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own growth concepts" 
ON public.growth_concepts FOR ALL 
USING (auth.uid() = user_id);

-- 3. Growth Posts (The Forge)
CREATE TABLE IF NOT EXISTS public.growth_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_id UUID NOT NULL REFERENCES public.growth_concepts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- LINKEDIN, X
    content TEXT NOT NULL,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, POSTED
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- We enable RLS on posts indirectly via concept ownership
ALTER TABLE public.growth_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own growth posts" 
ON public.growth_posts FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.growth_concepts 
        WHERE id = growth_posts.concept_id 
        AND user_id = auth.uid()
    )
);

-- 4. Engagement Opportunities (The Pulse)
CREATE TABLE IF NOT EXISTS public.engagement_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    query_url TEXT NOT NULL,
    theme_focus TEXT,
    suggested_reply TEXT,
    status TEXT DEFAULT 'NEW', -- NEW, DONE
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.engagement_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own engagement opportunities" 
ON public.engagement_opportunities FOR ALL 
USING (auth.uid() = user_id);
