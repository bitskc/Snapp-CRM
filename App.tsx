import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CRMProvider } from './contexts/CRMContext';
import { Login } from './components/Login';
import { Loader2 } from 'lucide-react';
import { ToastContainer } from './components/ToastContainer';

// Pages
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/Dashboard';
import { FinderPage } from './pages/Finder';
import { SettingsPageRoute } from './pages/Settings';
import { GrowthLab } from './pages/GrowthLab';
import { AutopilotPage } from './pages/Autopilot';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isRecovery } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="animate-spin mr-2" /> Loading session...
      </div>
    );
  }

  if (!user || isRecovery) {
    return <Navigate to="/login" replace />;
  }

  return (
    <CRMProvider>
      <Layout>{children}</Layout>
      <ToastContainer />
    </CRMProvider>
  );
};

const LoginPageWrapper = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="animate-spin mr-2" /> Loading session...
      </div>
    );
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return <Login />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Authentication */}
          <Route path="/login" element={<LoginPageWrapper />} />

          {/* Protected CRM App Routes */}
          <Route path="/app" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/finder" element={<ProtectedRoute><FinderPage /></ProtectedRoute>} />
          <Route path="/growth-lab" element={<ProtectedRoute><GrowthLab /></ProtectedRoute>} />
          <Route path="/autopilot" element={<ProtectedRoute><AutopilotPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPageRoute /></ProtectedRoute>} />

          {/* Catch-all redirect to Landing Page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
