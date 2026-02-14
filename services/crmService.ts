import { Lead, LeadStatus, Note, AppSettings, Product } from '../types';

const STORAGE_KEY_LEADS = 'servicesnapp_crm_data';
const STORAGE_KEY_SETTINGS = 'servicesnapp_crm_settings';
const STORAGE_KEY_PRODUCTS = 'servicesnapp_crm_products';

// Initial seed data
const SEED_LEADS: Lead[] = [
  {
    id: '1',
    companyName: 'Acme HVAC Services',
    contactName: 'John Doe',
    email: 'john@acmehvac.com',
    phone: '555-0123',
    status: LeadStatus.COLD,
    location: 'Oklahoma City, OK',
    description: 'Mid-sized HVAC company, uses paper invoices currently.',
    source: 'MANUAL',
    createdAt: new Date().toISOString(),
    productIds: [],
    notes: [
      { id: 'n1', content: 'Left a voicemail.', createdAt: new Date().toISOString(), author: 'Me' }
    ]
  },
  {
    id: '2',
    companyName: 'Sooner Plumbing',
    contactName: 'Jane Smith',
    status: LeadStatus.WARM,
    location: 'Tulsa, OK',
    description: 'Looking to switch from Service Titan.',
    source: 'MANUAL',
    createdAt: new Date().toISOString(),
    productIds: [],
    notes: []
  }
];

const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'ServiceSnapp',
  companyDescription: 'The premier mobile Field Service Management (FSM) application for HVAC, Plumbing, and Electrical businesses.',
  aboutMe: 'Professional, helpful, and direct sales approach.',
  sheetUrl: ''
};

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p1', name: 'ServiceSnapp Mobile', description: 'Core mobile app for technicians to view jobs and invoice in the field.' },
  { id: 'p2', name: 'ServiceSnapp Pro', description: 'Full desktop dashboard with dispatching, inventory, and payroll.' }
];

// --- Utilities ---

// Simple cache to prevent re-geocoding the same string in a session
const geocodeCache: Record<string, {lat: number, lon: number}> = {};

const geocodeLocation = async (location: string): Promise<{lat: number, lon: number} | null> => {
    if (geocodeCache[location]) return geocodeCache[location];
    
    try {
        // Using Nominatim (OpenStreetMap). 
        // Note: Please respect Usage Policy (max 1 req/sec). 
        // We rely on the UI not saving extremely rapidly in bulk for this simple demo.
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
  await new Promise(resolve => setTimeout(resolve, 300));
  const stored = localStorage.getItem(STORAGE_KEY_LEADS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(SEED_LEADS));
    return SEED_LEADS;
  }
  const leads = JSON.parse(stored);
  // Migration for old data without productIds or coords
  return leads.map((l: any) => ({ 
      ...l, 
      productIds: l.productIds || []
  }));
};

export const saveLead = async (lead: Lead): Promise<Lead> => {
  // Geocoding check: If location exists but no coords, try to find them.
  // This happens asynchronously to the UI but we await it here for simplicity in this demo.
  if (lead.location && (!lead.latitude || !lead.longitude)) {
      const coords = await geocodeLocation(lead.location);
      if (coords) {
          lead.latitude = coords.lat;
          lead.longitude = coords.lon;
      }
  }

  await new Promise(resolve => setTimeout(resolve, 200));
  const leads = await fetchLeads();
  const existingIndex = leads.findIndex(l => l.id === lead.id);
  
  if (existingIndex >= 0) {
    // Retain coords if they exist in DB but weren't passed (though they should be)
    // or if we just geocoded them, we overwrite.
    leads[existingIndex] = lead;
  } else {
    leads.push(lead);
  }
  
  localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(leads));
  return lead;
};

export const deleteLead = async (leadId: string): Promise<void> => {
  const leads = await fetchLeads();
  const filtered = leads.filter(l => l.id !== leadId);
  localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(filtered));
};

export const addNoteToLead = async (leadId: string, content: string): Promise<Note> => {
  const leads = await fetchLeads();
  const leadIndex = leads.findIndex(l => l.id === leadId);
  if (leadIndex === -1) throw new Error('Lead not found');

  const newNote: Note = {
    id: Math.random().toString(36).substr(2, 9),
    content,
    createdAt: new Date().toISOString(),
    author: 'User'
  };

  leads[leadIndex].notes.push(newNote);
  localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(leads));
  return newNote;
};

// --- Settings ---

export const fetchSettings = async (): Promise<AppSettings> => {
    const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!stored) return DEFAULT_SETTINGS;
    return JSON.parse(stored);
};

export const saveSettings = async (settings: AppSettings): Promise<AppSettings> => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    return settings;
};

// --- Products ---

export const fetchProducts = async (): Promise<Product[]> => {
    const stored = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
        return DEFAULT_PRODUCTS;
    }
    return JSON.parse(stored);
};

export const saveProduct = async (product: Product): Promise<Product> => {
    const products = await fetchProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
        products[index] = product;
    } else {
        products.push(product);
    }
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    return product;
};

export const deleteProduct = async (productId: string): Promise<void> => {
    const products = await fetchProducts();
    const filtered = products.filter(p => p.id !== productId);
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(filtered));
};