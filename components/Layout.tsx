import React from 'react';
import { LayoutDashboard, MessageSquarePlus, Settings, Database, Sliders, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();

  // Determine active tab based on pathname
  const getActiveTab = () => {
    if (location.pathname.startsWith('/finder')) return 'finder';
    if (location.pathname.startsWith('/settings')) return 'settings';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

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