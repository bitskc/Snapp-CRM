import { supabase } from './supabaseClient';
import { Lead, Note, AppSettings, Product, StatusConfig, GrowthSettings, GrowthConcept, GrowthPost, EngagementOpportunity } from '../types';

const DEFAULT_STATUSES: StatusConfig[] = [
  { id: 'COLD', label: 'Cold', color: 'blue', order: 0 },
  { id: 'WARM', label: 'Warm', color: 'yellow', order: 1 },
  { id: 'LIVE', label: 'Live', color: 'green', order: 2 },
  { id: 'DEAD', label: 'Dead', color: 'red', order: 3 },
];

const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'ServiceSnapp',
  companyDescription: 'The premier mobile Field Service Management (FSM) application for HVAC, Plumbing, and Electrical businesses.',
  aboutMe: 'Professional, helpful, and direct sales approach.',
  statuses: DEFAULT_STATUSES
};

// --- Utilities ---

const geocodeCache: Record<string, { lat: number, lon: number }> = {};
let geocodeChain: Promise<void> = Promise.resolve();
const GEOCODE_MIN_DELAY = 1100; // Nominatim policy is 1 req/sec

const geocodeLocation = (location: string): Promise<{ lat: number, lon: number } | null> => {
  if (!location) return Promise.resolve(null);
  if (geocodeCache[location]) return Promise.resolve(geocodeCache[location]);

  const result = new Promise<{ lat: number, lon: number } | null>((resolve) => {
    geocodeChain = geocodeChain.catch(() => {}).then(async () => {
      // Check cache again in case a queued request already resolved this location
      if (geocodeCache[location]) {
        resolve(geocodeCache[location]);
        return;
      }

      await new Promise(r => setTimeout(r, GEOCODE_MIN_DELAY));

      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'ServiceSnappCRM-Demo' }
        });
        const data = await res.json();
        if (data && data.length > 0) {
          const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
          geocodeCache[location] = coords;
          resolve(coords);
          return;
        }
      } catch (e) {
        console.warn("Geocoding failed for", location, e);
      }
      resolve(null);
    });
  });

  return result;
};

// --- Leads ---

export const fetchLeads = async (page: number = 0, pageSize: number = 50): Promise<{ leads: Lead[], totalCount: number }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error, count } = await supabase
    .from('leads')
    .select(`
      *,
      notes (*),
      lead_products (product_id)
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .range(page * pageSize, (page + 1) * pageSize - 1)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching leads:', error);
    return { leads: [], totalCount: 0 };
  }

  const leads = (data as any[]).map(row => ({
    id: row.id,
    user_id: row.user_id,
    companyName: row.company_name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    website: row.website,
    location: row.location,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    description: row.description,
    source: row.source,
    createdAt: row.created_at,
    aiAnalysis: row.ai_analysis,
    matchScore: row.match_score,
    matchReason: row.match_reason,
    notes: (row.notes || []).map((n: any) => ({
      id: n.id,
      content: n.content,
      createdAt: n.created_at,
      author: 'User',
      activityDate: n.activity_date ?? undefined,
      activityType: n.activity_type ?? undefined,
    })),
    productIds: (row.lead_products || []).map((lp: any) => lp.product_id)
  }));

  return { leads, totalCount: count || 0 };
};

export const saveLead = async (lead: Lead): Promise<Lead> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. Geocoding logic remains the same...
  let locationChanged = false;
  if (lead.id && lead.id.length > 10) {
    const { data: existingLead } = await supabase
      .from('leads')
      .select('location')
      .eq('id', lead.id)
      .single();

    locationChanged = existingLead && existingLead.location !== lead.location;
  }

  const needsGeocoding = lead.location && (!lead.latitude || !lead.longitude || locationChanged);

  if (needsGeocoding) {
    const coords = await geocodeLocation(lead.location!);
    if (coords) {
      lead.latitude = coords.lat;
      lead.longitude = coords.lon;
    }
  }

  // 2. Main Lead Update
  const leadData = {
    id: lead.id && lead.id.length > 10 ? lead.id : undefined,
    user_id: user.id, // Enforce ownership
    company_name: lead.companyName,
    contact_name: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    website: lead.website,
    location: lead.location,
    latitude: lead.latitude,
    longitude: lead.longitude,
    status: lead.status,
    description: lead.description,
    source: lead.source,
    ai_analysis: lead.aiAnalysis,
    match_score: lead.matchScore,
    match_reason: lead.matchReason,
    updated_at: new Date().toISOString()
  };

  const { data: savedLead, error } = await supabase
    .from('leads')
    .upsert(leadData)
    .select()
    .single();

  if (error) {
    console.error('Error saving lead:', error);
    throw error;
  }

  // 3. Handle Products (Many-to-Many)
  await supabase.from('lead_products').delete().eq('lead_id', savedLead.id);

  if (lead.productIds && lead.productIds.length > 0) {
    const productLinks = lead.productIds.map(pid => ({
      lead_id: savedLead.id,
      product_id: pid
    }));
    await supabase.from('lead_products').insert(productLinks);
  }

  return {
    ...lead,
    id: savedLead.id,
    user_id: savedLead.user_id,
    createdAt: savedLead.created_at
  };
};

export const deleteLead = async (leadId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId)
    .eq('user_id', user.id); // Extra safety

  if (error) throw error;
};

// --- Growth Lab ---

// Mapping helpers: DB snake_case ↔ TS camelCase
const mapGrowthSettings = (data: any): GrowthSettings => ({
  userId: data.user_id,
  currentCampaignTheme: data.current_campaign_theme,
  themeGoal: data.theme_goal,
  updatedAt: data.updated_at,
});

const mapGrowthConcept = (data: any): GrowthConcept => ({
  id: data.id,
  userId: data.user_id,
  topic: data.topic,
  themeSnapshot: data.theme_snapshot,
  status: data.status,
  createdAt: data.created_at,
});

const mapGrowthPost = (data: any): GrowthPost => ({
  id: data.id,
  conceptId: data.concept_id,
  platform: data.platform,
  content: data.content,
  status: data.status,
  createdAt: data.created_at,
});

const mapEngagementOpportunity = (data: any): EngagementOpportunity => ({
  id: data.id,
  userId: data.user_id,
  queryUrl: data.query_url,
  themeFocus: data.theme_focus,
  suggestedReply: data.suggested_reply,
  status: data.status,
  createdAt: data.created_at,
});

export const fetchGrowthSettings = async (): Promise<GrowthSettings | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('growth_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  return mapGrowthSettings(data);
};

export const saveGrowthSettings = async (settings: Partial<GrowthSettings>): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('growth_settings')
    .upsert({
      user_id: user.id,
      current_campaign_theme: settings.currentCampaignTheme,
      theme_goal: settings.themeGoal,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) throw error;
};

export const fetchGrowthConcepts = async (status?: string): Promise<GrowthConcept[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from('growth_concepts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data || []).map(mapGrowthConcept);
};

export const saveGrowthConcept = async (concept: Partial<GrowthConcept>): Promise<GrowthConcept> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('growth_concepts')
    .upsert({
      id: concept.id,
      user_id: user.id,
      topic: concept.topic,
      theme_snapshot: concept.themeSnapshot,
      status: concept.status || 'RAW',
      created_at: concept.createdAt || new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return mapGrowthConcept(data);
};

export const fetchGrowthPosts = async (conceptId: string): Promise<GrowthPost[]> => {
  const { data, error } = await supabase
    .from('growth_posts')
    .select('*')
    .eq('concept_id', conceptId);

  if (error) return [];
  return (data || []).map(mapGrowthPost);
};

export const saveGrowthPost = async (post: Partial<GrowthPost>): Promise<GrowthPost> => {
  const { data, error } = await supabase
    .from('growth_posts')
    .upsert({
      id: post.id,
      concept_id: post.conceptId,
      platform: post.platform,
      content: post.content,
      status: post.status || 'DRAFT',
      created_at: post.createdAt || new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return mapGrowthPost(data);
};

export const deleteGrowthPost = async (postId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('growth_posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
};

export const fetchEngagementOpportunities = async (): Promise<EngagementOpportunity[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('engagement_opportunities')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []).map(mapEngagementOpportunity);
};

export const saveEngagementOpportunity = async (opp: Partial<EngagementOpportunity>): Promise<EngagementOpportunity> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('engagement_opportunities')
    .upsert({
      id: opp.id,
      user_id: user.id,
      query_url: opp.queryUrl,
      theme_focus: opp.themeFocus,
      suggested_reply: opp.suggestedReply,
      status: opp.status || 'NEW',
      created_at: opp.createdAt || new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return mapEngagementOpportunity(data);
};

export const addNoteToLead = async (
  leadId: string,
  content: string,
  activityDate?: string,
  activityType?: 'call' | 'email' | 'text' | 'in_person'
): Promise<Note> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const insertPayload: Record<string, unknown> = {
    lead_id: leadId,
    content,
    type: 'MANUAL',
    user_id: user.id,
  };
  if (activityDate) insertPayload.activity_date = activityDate;
  if (activityType) insertPayload.activity_type = activityType;

  const { data, error } = await supabase
    .from('notes')
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    content: data.content,
    createdAt: data.created_at,
    author: 'User',
    activityDate: data.activity_date ?? undefined,
    activityType: data.activity_type ?? undefined,
  };
};

// --- Settings ---

export const fetchSettings = async (): Promise<AppSettings> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_SETTINGS;

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { ...DEFAULT_SETTINGS, user_id: user.id };
  }

  return {
    id: data.id,
    user_id: data.user_id,
    companyName: data.company_name || 'ServiceSnapp',
    companyDescription: data.company_description || '',
    aboutMe: data.about_me || '',
    statuses: data.statuses || DEFAULT_STATUSES,
    // Only map optional columns when present in the DB response so the save
    // payload won't reference columns that may not exist in older schemas.
    ...('sheet_url' in data ? { sheetUrl: data.sheet_url || '' } : {}),
    ...('autopilot_statuses' in data ? { autopilotStatuses: data.autopilot_statuses } : {})
  };
};

export const saveSettings = async (settings: AppSettings): Promise<AppSettings> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Live DB schema: id (integer, NOT NULL, no default/auto-increment),
  // user_id, statuses, company_name, company_description, about_me,
  // sheet_url, theme, updated_at.
  // NOTE: autopilot_statuses does NOT exist in live DB.
  const fields: Record<string, unknown> = {
    statuses: settings.statuses ?? DEFAULT_STATUSES,
    company_name: settings.companyName || null,
    company_description: settings.companyDescription || null,
    about_me: settings.aboutMe || null,
    sheet_url: settings.sheetUrl ?? null,
    updated_at: new Date().toISOString()
  };

  // Check if a row already exists for this user
  const { data: existing } = await supabase
    .from('settings')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  let data: any;
  let error: any;

  if (existing) {
    // Update existing row
    ({ data, error } = await supabase
      .from('settings')
      .update(fields)
      .eq('id', existing.id)
      .select()
      .single());
  } else {
    // Insert new row — id is integer with no default, so we must provide one
    const { data: maxRow } = await supabase
      .from('settings')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextId = (maxRow?.id ?? 0) + 1;

    ({ data, error } = await supabase
      .from('settings')
      .insert({ id: nextId, ...fields, user_id: user.id })
      .select()
      .single());
  }

  if (error) {
    console.error('Error saving settings:', error.message, error.details, error.hint);
    throw error;
  }

  return {
    id: data.id,
    user_id: data.user_id,
    companyName: data.company_name || 'ServiceSnapp',
    companyDescription: data.company_description || '',
    aboutMe: data.about_me || '',
    statuses: data.statuses || DEFAULT_STATUSES,
    ...('sheet_url' in data ? { sheetUrl: data.sheet_url || '' } : {}),
    ...('autopilot_statuses' in data ? { autopilotStatuses: data.autopilot_statuses } : {})
  };
};

// --- Products ---

export const fetchProducts = async (): Promise<Product[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id)
    .order('name');

  if (error) return [];

  return (data || []).map(p => ({
    id: p.id,
    user_id: p.user_id,
    name: p.name,
    description: p.description
  }));
};

export const saveProduct = async (product: Product): Promise<Product> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('products')
    .upsert({
      id: product.id && product.id.length > 10 ? product.id : undefined,
      user_id: user.id,
      name: product.name,
      description: product.description
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving product:', error);
    throw error;
  }

  return {
    ...product,
    id: data.id,
    user_id: data.user_id
  };
};

export const deleteProduct = async (productId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('user_id', user.id);

  if (error) throw error;
};