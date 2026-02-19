-- Migration: 20260216172000_core_crm_baseline.sql
-- Description: Baseline schema for core CRM entities used by the app.
-- Notes:
--   - Non-destructive: creates objects only if missing.
--   - Intended for new environments that do not yet have core CRM tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Settings
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    statuses JSONB NOT NULL DEFAULT
      '[{"id":"COLD","label":"Cold","color":"blue","order":0},{"id":"WARM","label":"Warm","color":"yellow","order":1},{"id":"LIVE","label":"Live","color":"green","order":2},{"id":"DEAD","label":"Dead","color":"red","order":3}]'::jsonb,
    company_name TEXT NOT NULL DEFAULT 'ServiceSnapp',
    company_description TEXT NOT NULL DEFAULT '',
    about_me TEXT NOT NULL DEFAULT '',
    sheet_url TEXT NOT NULL DEFAULT '',
    autopilot_statuses TEXT[] DEFAULT ARRAY['COLD', 'WARM', 'LIVE']::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS settings_user_id_key ON public.settings(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON public.settings(user_id);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.settings;
CREATE POLICY "Users can manage their own settings"
ON public.settings FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2) Leads
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT leads_source_check CHECK (source IN ('MANUAL', 'AI_FINDER'))
);

CREATE INDEX IF NOT EXISTS idx_leads_user_created_at ON public.leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_user_status ON public.leads(user_id, status);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own leads" ON public.leads;
CREATE POLICY "Users can manage their own leads"
ON public.leads FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3) Products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_user_name ON public.products(user_id, name);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own products" ON public.products;
CREATE POLICY "Users can manage their own products"
ON public.products FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4) Lead/Product join table
CREATE TABLE IF NOT EXISTS public.lead_products (
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (lead_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_products_product_id ON public.lead_products(product_id);

ALTER TABLE public.lead_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own lead-product links" ON public.lead_products;
CREATE POLICY "Users can manage their own lead-product links"
ON public.lead_products FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = lead_products.lead_id
        AND l.user_id = auth.uid()
    )
    AND EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = lead_products.product_id
        AND p.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = lead_products.lead_id
        AND l.user_id = auth.uid()
    )
    AND EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = lead_products.product_id
        AND p.user_id = auth.uid()
    )
);

-- 5) Notes
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'MANUAL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_lead_created_at ON public.notes(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
CREATE POLICY "Users can manage their own notes"
ON public.notes FOR ALL
USING (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = notes.lead_id
        AND l.user_id = auth.uid()
    )
)
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = notes.lead_id
        AND l.user_id = auth.uid()
    )
);
