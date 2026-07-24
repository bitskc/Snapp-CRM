import { apiFetch } from './netlifyClient';
import { Lead, Note, AppSettings, Product, GrowthSettings, GrowthConcept, GrowthPost, EngagementOpportunity } from '../types';

export const fetchLeads = async (page: number = 0, pageSize: number = 50): Promise<{ leads: Lead[], totalCount: number }> => {
    return apiFetch(`leads?page=${page}&pageSize=${pageSize}`);
};

export const saveLeadsBulk = async (leads: Lead[]): Promise<void> => {
    return apiFetch('leads/bulk', {
        method: 'POST',
        body: JSON.stringify({ leads }),
    });
};

export const saveLead = async (lead: Lead): Promise<Lead> => {
    return apiFetch('leads', {
        method: 'POST',
        body: JSON.stringify(lead),
    });
};

export const deleteLead = async (leadId: string): Promise<void> => {
    return apiFetch(`leads/${leadId}`, {
        method: 'DELETE',
    });
};

export const addNoteToLead = async (
    leadId: string,
    content: string,
    activityDate?: string,
    activityType?: 'call' | 'email' | 'text' | 'in_person'
): Promise<Note> => {
    return apiFetch(`leads/${leadId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content, activityDate, activityType }),
    });
};

export const fetchSettings = async (): Promise<AppSettings> => {
    return apiFetch('settings');
};

export const saveSettings = async (settings: AppSettings): Promise<AppSettings> => {
    return apiFetch('settings', {
        method: 'POST',
        body: JSON.stringify(settings),
    });
};

export const testSlackWebhook = async (webhookUrl: string): Promise<void> => {
    return apiFetch('slack/test', {
        method: 'POST',
        body: JSON.stringify({ webhookUrl }),
    });
};
export const fetchProducts = async (): Promise<Product[]> => {
    return apiFetch('products');
};

export const saveProduct = async (product: Product): Promise<Product> => {
    return apiFetch('products', {
        method: 'POST',
        body: JSON.stringify(product),
    });
};

export const deleteProduct = async (productId: string): Promise<void> => {
    return apiFetch(`products/${productId}`, {
        method: 'DELETE',
    });
};

export const fetchGrowthSettings = async (): Promise<GrowthSettings | null> => {
    return apiFetch('growth/settings');
};

export const saveGrowthSettings = async (settings: Partial<GrowthSettings>): Promise<void> => {
    return apiFetch('growth/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
    });
};

export const fetchGrowthConcepts = async (status?: string): Promise<GrowthConcept[]> => {
    return apiFetch(`growth/concepts${status ? `?status=${status}` : ''}`);
};

export const saveGrowthConcept = async (concept: Partial<GrowthConcept>): Promise<GrowthConcept> => {
    return apiFetch('growth/concepts', {
        method: 'POST',
        body: JSON.stringify(concept),
    });
};

export const fetchGrowthPosts = async (conceptId: string): Promise<GrowthPost[]> => {
    return apiFetch(`growth/posts?conceptId=${conceptId}`);
};

export const saveGrowthPost = async (post: Partial<GrowthPost>): Promise<GrowthPost> => {
    return apiFetch('growth/posts', {
        method: 'POST',
        body: JSON.stringify(post),
    });
};

export const deleteGrowthPost = async (postId: string): Promise<void> => {
    return apiFetch(`growth/posts/${postId}`, {
        method: 'DELETE',
    });
};

export const fetchEngagementOpportunities = async (): Promise<EngagementOpportunity[]> => {
    return apiFetch('growth/opportunities');
};

export const saveEngagementOpportunity = async (opp: Partial<EngagementOpportunity>): Promise<EngagementOpportunity> => {
    return apiFetch('growth/opportunities', {
        method: 'POST',
        body: JSON.stringify(opp),
    });
};
