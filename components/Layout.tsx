import React from 'react';
import { LayoutDashboard, MessageSquarePlus, Settings, Database, Sliders } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'finder' | 'settings';
  onTabChange: (tab: 'dashboard' | 'finder' | 'settings') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-900 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 shadow-sm flex-shrink-0 z-10">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-indigo-400">
            ServiceSnapp
          </h1>
          <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">CRM Suite</p>
        </div>
        
        <nav className="p-4 space-y-2">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dashboard' 
                ? 'bg-slate-800 text-brand-400 border border-slate-700' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard size={20} />
            Pipeline Board
          </button>
          
          <button
            onClick={() => onTabChange('finder')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'finder' 
                ? 'bg-slate-800 text-brand-400 border border-slate-700' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <MessageSquarePlus size={20} />
            Lead Finder AI
          </button>
          
           <button
            onClick={() => onTabChange('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'settings' 
                ? 'bg-slate-800 text-brand-400 border border-slate-700' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Sliders size={20} />
            Settings & Products
          </button>
        </nav>

        <div className="mt-auto p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-4 py-2 text-xs text-slate-500">
                <Database size={14} />
                <span>Connected: Mock Sheet</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 text-xs text-slate-500">
                <Settings size={14} />
                <span>v1.0.0</span>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden h-screen flex flex-col bg-slate-950">
        {children}
      </main>
    </div>
  );
};