import { supabase } from './supabaseClient';
import { Lead, Note, AppSettings, Product, StatusConfig } from '../types';

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
  sheetUrl: '',
  statuses: DEFAULT_STATUSES
};

// --- Utilities ---

const geocodeCache: Record<string, { lat: number, lon: number }> = {};

const geocodeLocation = async (location: string): Promise<{ lat: number, lon: number } | null> => {
  if (geocodeCache[location]) return geocodeCache[location];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ServiceSnappCRM-Demo'
      }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      geocodeCache[location] = coords;
      return coords;
    }
  } catch (e) {
    console.warn("Geocoding failed for", location, e);
  }
  return null;
};

// --- Leads ---

export const fetchLeads = async (): Promise<Lead[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      notes (*),
      lead_products (product_id)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching leads:', error);
    return [];
  }

  return (data as any[]).map(row => ({
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
      author: 'User'
    })),
    productIds: (row.lead_products || []).map((lp: any) => lp.product_id)
  }));
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

export const addNoteToLead = async (leadId: string, content: string): Promise<Note> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notes')
    .insert({
      lead_id: leadId,
      content,
      type: 'MANUAL',
      user_id: user.id // Assign owner to note if schema supports, or rely on lead relation
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    content: data.content,
    createdAt: data.created_at,
    author: 'User'
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
    .maybeSingle(); // Don't throw if not found

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
    sheetUrl: data.sheet_url || ''
  };
};

export const saveSettings = async (settings: AppSettings): Promise<AppSettings> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('settings')
    .upsert({
      user_id: user.id, // Key match for uniqueness logic or RLS
      statuses: settings.statuses,
      company_name: settings.companyName,
      company_description: settings.companyDescription,
      about_me: settings.aboutMe,
      sheet_url: settings.sheetUrl,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' }) // Ensure one row per user
    .select()
    .single();

  if (error) {
    console.error('Error saving settings:', error);
    throw error;
  }

  return {
    ...settings,
    id: data.id,
    user_id: data.user_id
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