import { FC, ReactNode, useState, useEffect } from 'react';
import { LayoutDashboard, MessageSquarePlus, Settings, Database, Sliders, LogOut, Rocket, Zap } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AutopilotQueue } from '../types';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();

  // Determine active tab based on pathname
  const getActiveTab = () => {
    if (location.pathname.startsWith('/finder')) return 'finder';
    if (location.pathname.startsWith('/growth-lab')) return 'growth';
    if (location.pathname.startsWith('/autopilot')) return 'autopilot';
    if (location.pathname.startsWith('/settings')) return 'settings';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  // Read autopilot pending count from localStorage (lightweight, no hook needed)
  const [autopilotBadge, setAutopilotBadge] = useState(0);
  useEffect(() => {
    const readBadge = () => {
      try {
        const raw = localStorage.getItem('autopilot-queue');
        if (!raw) { setAutopilotBadge(0); return; }
        const q: AutopilotQueue = JSON.parse(raw);
        setAutopilotBadge(q.actions.filter(a => a.status === 'pending').length);
      } catch { setAutopilotBadge(0); }
    };
    readBadge();
    // Re-read on storage events (cross-tab sync)
    window.addEventListener('storage', readBadge);
    // Subscribe to same-tab queue updates via custom event
    window.addEventListener('autopilot-queue-updated', readBadge);
    return () => {
      window.removeEventListener('storage', readBadge);
      window.removeEventListener('autopilot-queue-updated', readBadge);
    };
  }, []);

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-900 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 shadow-sm flex-col flex-shrink-0 z-20">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-indigo-400">
            ServiceSnapp
          </h1>
          <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">CRM Suite</p>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          <button
            onClick={() => navigate('/')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard'
              ? 'bg-slate-800 text-brand-400 border border-slate-700'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
          >
            <LayoutDashboard size={20} />
            Pipeline Board
          </button>

          <button
            onClick={() => navigate('/finder')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'finder'
              ? 'bg-slate-800 text-brand-400 border border-slate-700'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
          >
            <MessageSquarePlus size={20} />
            Lead Finder AI
          </button>

          <button
            onClick={() => navigate('/growth-lab')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'growth'
              ? 'bg-slate-800 text-brand-400 border border-slate-700'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
          >
            <Rocket size={20} />
            Growth Lab
          </button>

          <button
            onClick={() => navigate('/autopilot')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'autopilot'
              ? 'bg-slate-800 text-brand-400 border border-slate-700'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
          >
            <Zap size={20} />
            <span className="flex-1 text-left">Sales Plan</span>
            {autopilotBadge > 0 && (
              <span className="bg-brand-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                {autopilotBadge}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate('/settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings'
              ? 'bg-slate-800 text-brand-400 border border-slate-700'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
          >
            <Sliders size={20} />
            Settings & Products
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-slate-500 mb-2 truncate">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            {user?.email}
          </div>

          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-2 text-xs text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative z-0 h-full">
        {children}
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="md:hidden bg-slate-900 border-t border-slate-800 flex justify-around p-2 pb-safe z-30">
        <button
          onClick={() => navigate('/')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'dashboard' ? 'text-brand-400' : 'text-slate-500'
            }`}
        >
          <LayoutDashboard size={24} />
          Pipeline
        </button>

        <button
          onClick={() => navigate('/finder')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'finder' ? 'text-brand-400' : 'text-slate-500'
            }`}
        >
          <MessageSquarePlus size={24} />
          Finder
        </button>

        <button
          onClick={() => navigate('/growth-lab')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'growth' ? 'text-brand-400' : 'text-slate-500'
            }`}
        >
          <Rocket size={24} />
          Growth
        </button>

        <button
          onClick={() => navigate('/autopilot')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-colors relative ${activeTab === 'autopilot' ? 'text-brand-400' : 'text-slate-500'
            }`}
        >
          <Zap size={24} />
          Plan
          {autopilotBadge > 0 && (
            <span className="absolute top-0.5 right-0.5 bg-brand-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {autopilotBadge}
            </span>
          )}
        </button>

        <button
          onClick={() => navigate('/settings')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'settings' ? 'text-brand-400' : 'text-slate-500'
            }`}
        >
          <Sliders size={24} />
          Settings
        </button>

        <button
          onClick={signOut}
          className="flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium text-slate-500 hover:text-red-400"
        >
          <LogOut size={24} />
          Sign Out
        </button>
      </nav>
    </div>
  );
};