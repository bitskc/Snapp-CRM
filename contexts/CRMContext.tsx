import * as React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Lead, AppSettings, Product, LeadStatus, ChatMessage } from '../types';
import { fetchLeads, saveLead, deleteLead as apiDeleteLead, fetchSettings, saveSettings, fetchProducts, saveProduct as apiSaveProduct, deleteProduct as apiDeleteProduct } from '../services/crmService';
import { useAuth } from './AuthContext';

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface CRMContextType {
    leads: Lead[];
    totalLeads: number;
    settings: AppSettings | null;
    products: Product[];
    isLoading: boolean;
    page: number;
    hasMore: boolean;
    toasts: Toast[];

    finderMessages: ChatMessage[];
    finderQuery: string;
    setFinderMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    setFinderQuery: (q: string) => void;

    refreshData: () => Promise<void>;
    loadMore: () => Promise<void>;
    updateLead: (lead: Lead) => Promise<void>;
    updateLeadStatus: (leadId: string, status: LeadStatus) => Promise<void>;
    deleteLead: (leadId: string) => Promise<void>;
    updateSettings: (settings: AppSettings) => Promise<void>;
    saveProduct: (product: Product) => Promise<void>;
    deleteProduct: (productId: string) => Promise<void>;
    addToast: (message: string, type?: Toast['type']) => void;
    removeToast: (id: string) => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

const PAGE_SIZE = 50;

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [totalLeads, setTotalLeads] = useState(0);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Finder State
    const [finderQuery, setFinderQuery] = useState('');
    const [finderMessages, setFinderMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'model',
            text: 'Hello! I can help you find new leads. Try asking: "Find 10 HVAC companies in Dallas that might use Service Titan".',
        }
    ]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);

        const timer = setTimeout(() => {
            removeToast(id);
        }, 5000);

        return () => clearTimeout(timer);
    }, [removeToast]);

    const loadData = useCallback(async (targetPage: number, reset: boolean) => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Only fetch settings and products on reset (initial load)
            const promises: [Promise<{ leads: Lead[], totalCount: number }>, Promise<AppSettings | null>, Promise<Product[]>] = [
                fetchLeads(targetPage, PAGE_SIZE),
                reset ? fetchSettings() : Promise.resolve(null),
                reset ? fetchProducts() : Promise.resolve([])
            ];

            const [leadsResult, settingsData, productsData] = await Promise.all(promises);

            setLeads(prev => reset ? leadsResult.leads : [...prev, ...leadsResult.leads]);
            setPage(reset ? 0 : targetPage);
            setTotalLeads(leadsResult.totalCount);

            if (reset) {
                if (settingsData) setSettings(settingsData);
                if (productsData.length > 0) setProducts(productsData);
            }
        } catch (e) {
            console.error("Failed to fetch CRM data", e);
            addToast("Failed to load data. Please refresh.", "error");
        } finally {
            setIsLoading(false);
        }
    }, [user, addToast]);

    const refreshData = useCallback(() => loadData(0, true), [loadData]);
    const loadMore = useCallback(() => loadData(page + 1, false), [loadData, page]);

    const updateLead = async (updatedLead: Lead) => {
        const originalLeads = [...leads];
        // Optimistically update local state
        setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));

        try {
            const saved = await saveLead(updatedLead);
            // Update with the version from server (which might have new coords)
            setLeads(prev => prev.map(l => l.id === saved.id ? saved : l));
            addToast(`${updatedLead.companyName} updated successfully`, "success");
        } catch (e) {
            setLeads(originalLeads);
            addToast(`Failed to save changes to ${updatedLead.companyName}`, "error");
        }
    };

    const updateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
        const lead = leads.find(l => l.id === leadId);
        if (!lead) return;

        const updatedLead = { ...lead, status: newStatus };
        setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));

        try {
            await saveLead(updatedLead);
            // No toast for status update to avoid drag-and-drop spam
        } catch (e) {
            setLeads(prev => prev.map(l => l.id === leadId ? lead : l));
            addToast("Failed to update status", "error");
        }
    };

    const handleDeleteLead = async (leadId: string) => {
        const originalLeads = [...leads];
        setLeads(prev => prev.filter(l => l.id !== leadId));
        setTotalLeads(prev => prev - 1);

        try {
            await apiDeleteLead(leadId);
            addToast("Lead deleted", "info");
        } catch (e) {
            setLeads(originalLeads);
            setTotalLeads(prev => prev + 1);
            addToast("Failed to delete lead", "error");
        }
    };

    const updateSettings = async (newSettings: AppSettings) => {
        try {
            const saved = await saveSettings(newSettings);
            setSettings(saved);
            addToast("Settings saved successfully", "success");
        } catch (e) {
            console.error("Settings save error", e);
            addToast("Failed to save settings", "error");
        }
    };

    const handleSaveProduct = async (product: Product) => {
        try {
            const saved = await apiSaveProduct(product);
            setProducts(prev => {
                const exists = prev.find(p => p.id === saved.id);
                if (exists) return prev.map(p => p.id === saved.id ? saved : p);
                return [...prev, saved];
            });
            addToast(`Product "${product.name}" saved`, "success");
        } catch (e) {
            console.error("Product save error", e);
            addToast("Failed to save product", "error");
        }
    };

    const handleDeleteProduct = async (productId: string) => {
        try {
            await apiDeleteProduct(productId);
            setProducts(prev => prev.filter(p => p.id !== productId));
            addToast("Product deleted", "info");
        } catch (e) {
            console.error("Product delete error", e);
            addToast("Failed to delete product", "error");
        }
    };

    useEffect(() => {
        if (user) {
            loadData(0, true);
        } else {
            setLeads([]);
            setTotalLeads(0);
            setSettings(null);
            setProducts([]);
        }
    }, [user, loadData]);

    return (
        <CRMContext.Provider value={{
            leads,
            totalLeads,
            settings,
            products,
            isLoading,
            page,
            hasMore: leads.length < totalLeads,
            toasts,
            finderMessages,
            finderQuery,
            setFinderMessages,
            setFinderQuery,
            refreshData,
            loadMore,
            updateLead,
            updateLeadStatus,
            deleteLead: handleDeleteLead,
            updateSettings,
            saveProduct: handleSaveProduct,
            deleteProduct: handleDeleteProduct,
            addToast,
            removeToast
        }}>
            {children}
        </CRMContext.Provider>
    );
};

export const useCRM = () => {
    const context = useContext(CRMContext);
    if (context === undefined) {
        throw new Error('useCRM must be used within a CRMProvider');
    }
    return context;
};
