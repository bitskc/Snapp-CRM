import * as netlifyCrm from './netlifyCrmService';
import * as supabaseCrm from './supabaseCrmService';
import { Lead, Note, AppSettings, Product, GrowthSettings, GrowthConcept, GrowthPost, EngagementOpportunity } from '../types';

const isSupabase = import.meta.env.VITE_STORAGE_PROVIDER === 'supabase';
const activeCrm = isSupabase ? supabaseCrm : netlifyCrm;

export const fetchLeads = (page: number = 0, pageSize: number = 50): Promise<{ leads: Lead[], totalCount: number }> =>
    activeCrm.fetchLeads(page, pageSize);

export const saveLeadsBulk = (leads: Lead[]): Promise<void> =>
    activeCrm.saveLeadsBulk(leads);

export const saveLead = (lead: Lead): Promise<Lead> =>
    activeCrm.saveLead(lead);

export const deleteLead = (leadId: string): Promise<void> =>
    activeCrm.deleteLead(leadId);

export const addNoteToLead = (
    leadId: string,
    content: string,
    activityDate?: string,
    activityType?: 'call' | 'email' | 'text' | 'in_person'
): Promise<Note> =>
    activeCrm.addNoteToLead(leadId, content, activityDate, activityType);

export const fetchSettings = (): Promise<AppSettings> =>
    activeCrm.fetchSettings();

export const saveSettings = (settings: AppSettings): Promise<AppSettings> =>
    activeCrm.saveSettings(settings);

export const testSlackWebhook = (webhookUrl: string): Promise<void> =>
    (activeCrm as any).testSlackWebhook ? (activeCrm as any).testSlackWebhook(webhookUrl) : Promise.resolve();
export const fetchProducts = (): Promise<Product[]> =>
    activeCrm.fetchProducts();

export const saveProduct = (product: Product): Promise<Product> =>
    activeCrm.saveProduct(product);

export const deleteProduct = (productId: string): Promise<void> =>
    activeCrm.deleteProduct(productId);

export const fetchGrowthSettings = (): Promise<GrowthSettings | null> =>
    activeCrm.fetchGrowthSettings();

export const saveGrowthSettings = (settings: Partial<GrowthSettings>): Promise<void> =>
    activeCrm.saveGrowthSettings(settings);

export const fetchGrowthConcepts = (status?: string): Promise<GrowthConcept[]> =>
    activeCrm.fetchGrowthConcepts(status);

export const saveGrowthConcept = (concept: Partial<GrowthConcept>): Promise<GrowthConcept> =>
    activeCrm.saveGrowthConcept(concept);

export const fetchGrowthPosts = (conceptId: string): Promise<GrowthPost[]> =>
    activeCrm.fetchGrowthPosts(conceptId);

export const saveGrowthPost = (post: Partial<GrowthPost>): Promise<GrowthPost> =>
    activeCrm.saveGrowthPost(post);

export const deleteGrowthPost = (postId: string): Promise<void> =>
    activeCrm.deleteGrowthPost(postId);

export const fetchEngagementOpportunities = (): Promise<EngagementOpportunity[]> =>
    activeCrm.fetchEngagementOpportunities();

export const saveEngagementOpportunity = (opp: Partial<EngagementOpportunity>): Promise<EngagementOpportunity> =>
    activeCrm.saveEngagementOpportunity(opp);
