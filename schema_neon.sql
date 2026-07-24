-- Portable PostgreSQL Schema for Snapp CRM (Compatible with Neon, Postgres, Supabase)


-- 1) Settings
CREATE TABLE IF NOT EXISTS public.settings (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    statuses JSONB NOT NULL DEFAULT
      '[{"id":"COLD","label":"Cold","color":"blue","order":0},{"id":"WARM","label":"Warm","color":"yellow","order":1},{"id":"LIVE","label":"Live","color":"green","order":2},{"id":"DEAD","label":"Dead","color":"red","order":3}]'::jsonb,
    company_name TEXT NOT NULL DEFAULT 'ServiceSnapp',
    company_description TEXT NOT NULL DEFAULT '',
    about_me TEXT NOT NULL DEFAULT '',
    sheet_url TEXT NOT NULL DEFAULT '',
    autopilot_statuses TEXT[] DEFAULT ARRAY['COLD', 'WARM', 'LIVE']::TEXT[],
    slack_webhook_url TEXT,
    slack_notify_new_lead BOOLEAN DEFAULT true,
    slack_notify_new_note BOOLEAN DEFAULT true,
    gemini_api_key TEXT,
    openai_api_key TEXT,
    anthropic_api_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS settings_user_id_key ON public.settings(user_id);

-- 2) Leads
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    location TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'COLD',
    description TEXT,
    source TEXT NOT NULL DEFAULT 'MANUAL',
    ai_analysis JSONB,
    match_score INTEGER,
    match_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_user_created_at ON public.leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_user_status ON public.leads(user_id, status);

-- 3) Products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_user_name ON public.products(user_id, name);

-- 4) Lead Products
CREATE TABLE IF NOT EXISTS public.lead_products (
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (lead_id, product_id)
);

-- 5) Notes
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'MANUAL',
    activity_date DATE,
    activity_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_lead_created_at ON public.notes(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);

-- 6) Growth Settings
CREATE TABLE IF NOT EXISTS public.growth_settings (
    user_id TEXT PRIMARY KEY,
    current_campaign_theme TEXT,
    theme_goal TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7) Growth Concepts
CREATE TABLE IF NOT EXISTS public.growth_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    theme_snapshot TEXT,
    status TEXT DEFAULT 'RAW',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8) Growth Posts
CREATE TABLE IF NOT EXISTS public.growth_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_id UUID NOT NULL REFERENCES public.growth_concepts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9) Engagement Opportunities
CREATE TABLE IF NOT EXISTS public.engagement_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    query_url TEXT NOT NULL,
    theme_focus TEXT,
    suggested_reply TEXT,
    status TEXT DEFAULT 'NEW',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
