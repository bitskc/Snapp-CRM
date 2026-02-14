import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { fetchLeads, saveLead, fetchSettings, fetchProducts } from './services/crmService';
import { Lead, LeadStatus, AppSettings, Product, ChatMessage } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Loader2 } from 'lucide-react';

// Pages
import { DashboardPage } from './pages/Dashboard';
import { FinderPage } from './pages/Finder';
import { SettingsPageRoute } from './pages/Settings';

const AppContent = () => {
  const { user, loading } = useAuth();

  // Data State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Lead Finder State (Lifted for persistence across routes)
  const [finderQuery, setFinderQuery] = useState('');
  const [finderMessages, setFinderMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hello! I can help you find new leads. Try asking: "Find 10 HVAC companies in Dallas that might use Service Titan".',
    }
  ]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [leadsData, settingsData, productsData] = await Promise.all([
        fetchLeads(),
        fetchSettings(),
        fetchProducts()
      ]);
      setLeads(leadsData);
      setSettings(settingsData);
      setProducts(productsData);
    } catch (e) {
      console.error("Failed to fetch data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleLeadUpdate = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
  };

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const updatedLead = { ...lead, status: newStatus };

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));

    try {
      await saveLead(updatedLead);
    } catch (e) {
      // Revert on failure
      console.error("Failed to update status", e);
      setLeads(prev => prev.map(l => l.id === leadId ? lead : l));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="animate-spin mr-2" /> Loading session...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={
            <DashboardPage
              leads={leads}
              settings={settings}
              products={products}
              isLoading={isLoading}
              onRefresh={loadData}
              onLeadUpdate={handleLeadUpdate}
              onStatusChange={handleStatusChange}
            />
          } />

          <Route path="/finder" element={
            <FinderPage
              messages={finderMessages}
              onMessagesChange={setFinderMessages}
              query={finderQuery}
              onQueryChange={setFinderQuery}
              onLeadAdded={loadData}
            />
          } />

          <Route path="/settings" element={
            <SettingsPageRoute
              settings={settings}
              products={products}
              onSettingsUpdate={setSettings}
              onProductsUpdate={setProducts}
            />
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}