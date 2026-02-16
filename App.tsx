import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { fetchLeads, saveLead, fetchSettings, fetchProducts } from './services/crmService';
import { Lead, LeadStatus, AppSettings, Product, ChatMessage } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CRMProvider } from './contexts/CRMContext';
import { Login } from './components/Login';
import { Loader2 } from 'lucide-react';
import { ToastContainer } from './components/ToastContainer';

// Pages
import { DashboardPage } from './pages/Dashboard';
import { FinderPage } from './pages/Finder';
import { SettingsPageRoute } from './pages/Settings';
import { GrowthLab } from './pages/GrowthLab';
import { AutopilotPage } from './pages/Autopilot';

const AppContent = () => {
  const { user, loading } = useAuth();

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
    <CRMProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/finder" element={<FinderPage />} />
            <Route path="/growth-lab" element={<GrowthLab />} />
            <Route path="/autopilot" element={<AutopilotPage />} />
            <Route path="/settings" element={<SettingsPageRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
        <ToastContainer />
      </BrowserRouter>
    </CRMProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}