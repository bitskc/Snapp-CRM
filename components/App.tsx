import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LeadFinder } from './components/LeadFinder';
import { LeadModal } from './components/LeadModal';
import { SettingsPage } from './components/SettingsPage';
import { MapView } from './components/MapView';
import { fetchLeads, saveLead, fetchSettings, fetchProducts } from './services/crmService';
import { Lead, LeadStatus, AppSettings, Product } from './types';
import { Search, Filter, RefreshCw, MoreHorizontal, List, Kanban, CalendarClock, ChevronDown, Map as MapIcon, Flame } from 'lucide-react';

// Kanban Column Component
const KanbanColumn: React.FC<{
  title: string;
  count: number;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  color: string;
}> = ({ title, count, leads, onCardClick, color }) => {
  // Convert color name (e.g. 'blue') to actual tailwind classes safely if using dynamic colors
  const borderClass = color.startsWith('border-') ? color : `border-${color}-500`;

  return (
    <div className="flex-1 min-w-[280px] bg-slate-900/50 rounded-xl p-3 flex flex-col h-full border border-slate-800/60">
      <div className={`flex items-center justify-between mb-4 pb-2 border-b ${borderClass}`}>
        <h3 className="font-semibold text-slate-300 text-sm tracking-wide uppercase">{title}</h3>
        <span className="bg-slate-800 px-2 py-0.5 rounded-full text-xs font-bold text-slate-400 shadow-sm border border-slate-700">
          {count}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
        {leads.map(lead => (
          <div
            key={lead.id}
            onClick={() => onCardClick(lead)}
            className="bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-700 hover:shadow-md hover:border-brand-500/50 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-slate-200 line-clamp-1 group-hover:text-brand-400 transition-colors">
                {lead.companyName}
              </h4>
              <MoreHorizontal size={16} className="text-slate-500 hover:text-slate-300" />
            </div>
            
            <p className="text-xs text-slate-400 mb-3 line-clamp-2">
              {lead.description || 'No description available'}
            </p>
            
            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-1.5">
                 {lead.source === 'AI_FINDER' && (
                     <span className="text-[10px] bg-purple-900/30 text-purple-400 px-1.5 py-0.5 rounded border border-purple-800/50 font-medium">AI Found</span>
                 )}
                 {lead.aiAnalysis && (
                     <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium flex items-center gap-1
                        ${lead.aiAnalysis.score >= 80 ? 'bg-green-900/30 text-green-400 border-green-800/50' : 
                          lead.aiAnalysis.score >= 50 ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50' :
                          'bg-red-900/30 text-red-400 border-red-800/50'
                        }
                     `}>
                        <Flame size={10} /> {lead.aiAnalysis.score}
                     </span>
                 )}
              </div>
              
              <div className="flex items-center gap-2">
                   <span className="text-[10px] text-slate-500">
                    {new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                   </span>
                  {lead.notes.length > 0 && (
                    <span className="text-[10px] bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded border border-slate-800">
                      {lead.notes.length} notes
                    </span>
                  )}
              </div>
            </div>
          </div>
        ))}
        {leads.length === 0 && (
          <div className="h-24 border-2 border-dashed border-slate-800 rounded-lg flex items-center justify-center text-slate-600 text-xs">
            No leads
          </div>
        )}
      </div>
    </div>
  );
};

// List View Component
const ListView: React.FC<{
  leads: Lead[];
  onRowClick: (lead: Lead) => void;
  settings: AppSettings;
}> = ({ leads, onRowClick, settings }) => {
    return (
        <div className="w-full h-full overflow-hidden bg-slate-900 rounded-xl border border-slate-800 shadow-sm flex flex-col">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-800 bg-slate-900/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <div className="col-span-3">Company</div>
                <div className="col-span-2">Contact</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-3">Last Note</div>
                <div className="col-span-2 text-right">Added</div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {leads.map(lead => {
                    const lastNote = lead.notes[lead.notes.length - 1];
                    const statusConfig = settings.statuses.find(s => s.id === lead.status);
                    
                    return (
                        <div 
                            key={lead.id} 
                            onClick={() => onRowClick(lead)}
                            className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-800/50 items-center hover:bg-slate-800/50 cursor-pointer transition-colors text-sm"
                        >
                            <div className="col-span-3 font-medium text-slate-200 truncate">{lead.companyName}</div>
                            <div className="col-span-2 text-slate-400 truncate">{lead.contactName || '-'}</div>
                            <div className="col-span-2">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide
                                    ${statusConfig 
                                        ? `bg-${statusConfig.color}-900/30 text-${statusConfig.color}-400 border border-${statusConfig.color}-800/50` 
                                        : 'bg-slate-800 text-slate-400'}
                                 `}>
                                   {statusConfig?.label || lead.status}
                                 </span>
                            </div>
                            <div className="col-span-3 text-slate-500 truncate text-xs">
                                {lastNote ? lastNote.content : <span className="text-slate-700 italic">No notes</span>}
                            </div>
                            <div className="col-span-2 text-right text-slate-600 text-xs">
                                {new Date(lead.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    );
                })}
                {leads.length === 0 && (
                    <div className="p-8 text-center text-slate-500">No leads found matching criteria.</div>
                )}
            </div>
        </div>
    );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'finder' | 'settings'>('dashboard');
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'map'>('kanban');
  const [groupBy, setGroupBy] = useState<'STATUS' | 'HOTNESS'>('STATUS');
  
  // Data State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI State
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [needsContactFilter, setNeedsContactFilter] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isGroupByMenuOpen, setIsGroupByMenuOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'MANUAL' | 'AI'>('ALL');

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
    loadData();
  }, []);

  const handleLeadUpdate = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    setSelectedLead(updatedLead);
  };

  // Filter Logic
  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.companyName.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          l.description?.toLowerCase().includes(searchFilter.toLowerCase());
    
    let matchesNeedsContact = true;
    if (needsContactFilter) {
        const today = new Date().toDateString();
        const contactedToday = l.notes.some(n => new Date(n.createdAt).toDateString() === today);
        matchesNeedsContact = !contactedToday && l.status !== 'DEAD';
    }

    let matchesSource = true;
    if (sourceFilter === 'MANUAL') matchesSource = l.source === 'MANUAL';
    if (sourceFilter === 'AI') matchesSource = l.source === 'AI_FINDER';
    
    return matchesSearch && matchesNeedsContact && matchesSource;
  });

  // Navigation handlers
  const handleNextLead = () => {
      if (!selectedLead) return;
      const index = filteredLeads.findIndex(l => l.id === selectedLead.id);
      if (index !== -1 && index < filteredLeads.length - 1) {
          setSelectedLead(filteredLeads[index + 1]);
      }
  };

  const handlePrevLead = () => {
      if (!selectedLead) return;
      const index = filteredLeads.findIndex(l => l.id === selectedLead.id);
      if (index > 0) {
          setSelectedLead(filteredLeads[index - 1]);
      }
  };

  const selectedIndex = selectedLead ? filteredLeads.findIndex(l => l.id === selectedLead.id) : -1;
  const hasNext = selectedIndex >= 0 && selectedIndex < filteredLeads.length - 1;
  const hasPrev = selectedIndex > 0;

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      
      {activeTab === 'dashboard' && (
        <div className="flex flex-col h-full bg-slate-950 relative">
          {/* Dashboard Header - High Z-Index to stay on top */}
          <div className="px-6 py-4 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 relative z-[100]">
            <div className="flex items-center gap-4 flex-1 w-full">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Search leads..." 
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder-slate-600"
                />
              </div>
              <button onClick={loadData} className="p-2 text-slate-500 hover:text-brand-400 hover:bg-slate-900 rounded-lg transition-colors" title="Refresh">
                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto relative z-20 flex-wrap md:flex-nowrap">
                <button 
                  onClick={() => setNeedsContactFilter(!needsContactFilter)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all whitespace-nowrap
                    ${needsContactFilter 
                      ? 'bg-brand-900/30 text-brand-400 border-brand-800' 
                      : 'text-slate-400 hover:bg-slate-900 border-transparent hover:border-slate-800'}
                  `}
                >
                    <CalendarClock size={16} /> Needs Contact Today
                </button>

                {/* Group By Dropdown */}
                 <div className="relative">
                    <button 
                        onClick={() => { setIsGroupByMenuOpen(!isGroupByMenuOpen); setIsFilterMenuOpen(false); }}
                        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all whitespace-nowrap
                        ${groupBy !== 'STATUS'
                        ? 'bg-purple-900/30 text-purple-400 border-purple-800' 
                        : 'text-slate-400 hover:bg-slate-900 border-transparent hover:border-slate-800'}
                        `}
                    >
                        {groupBy === 'STATUS' ? 'Status' : 'Hotness'} <ChevronDown size={14} />
                    </button>
                    
                    {isGroupByMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50">
                            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Group By</div>
                            <button 
                                onClick={() => { setGroupBy('STATUS'); setIsGroupByMenuOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-sm ${groupBy === 'STATUS' ? 'text-brand-400 bg-slate-800' : 'text-slate-300 hover:bg-slate-800'}`}
                            >
                                Pipeline Status
                            </button>
                            <button 
                                onClick={() => { setGroupBy('HOTNESS'); setIsGroupByMenuOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-sm ${groupBy === 'HOTNESS' ? 'text-purple-400 bg-slate-800' : 'text-slate-300 hover:bg-slate-800'}`}
                            >
                                Deal Hotness (AI Score)
                            </button>
                        </div>
                    )}
                </div>

                {/* Filter Dropdown */}
                <div className="relative">
                    <button 
                        onClick={() => { setIsFilterMenuOpen(!isFilterMenuOpen); setIsGroupByMenuOpen(false); }}
                        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all whitespace-nowrap
                        ${sourceFilter !== 'ALL'
                        ? 'bg-brand-900/30 text-brand-400 border-brand-800' 
                        : 'text-slate-400 hover:bg-slate-900 border-transparent hover:border-slate-800'}
                        `}
                    >
                        <Filter size={16} /> Filter <ChevronDown size={14} />
                    </button>
                    
                    {isFilterMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50 ring-1 ring-black ring-opacity-5">
                            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Source</div>
                            <button 
                                onClick={() => { setSourceFilter('ALL'); setIsFilterMenuOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-sm ${sourceFilter === 'ALL' ? 'text-brand-400 bg-slate-800' : 'text-slate-300 hover:bg-slate-800'}`}
                            >
                                All Sources
                            </button>
                            <button 
                                onClick={() => { setSourceFilter('MANUAL'); setIsFilterMenuOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-sm ${sourceFilter === 'MANUAL' ? 'text-brand-400 bg-slate-800' : 'text-slate-300 hover:bg-slate-800'}`}
                            >
                                Manual Entry
                            </button>
                            <button 
                                onClick={() => { setSourceFilter('AI'); setIsFilterMenuOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-sm ${sourceFilter === 'AI' ? 'text-brand-400 bg-slate-800' : 'text-slate-300 hover:bg-slate-800'}`}
                            >
                                AI Finder
                            </button>
                        </div>
                    )}
                </div>

                <div className="h-6 w-px bg-slate-800 mx-1 hidden md:block"></div>

                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button 
                        onClick={() => setViewMode('kanban')}
                        className={`p-1.5 rounded transition-all ${viewMode === 'kanban' ? 'bg-slate-800 text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        title="Kanban View"
                    >
                        <Kanban size={18} />
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-slate-800 text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        title="List View"
                    >
                        <List size={18} />
                    </button>
                    <button 
                        onClick={() => setViewMode('map')}
                        className={`p-1.5 rounded transition-all ${viewMode === 'map' ? 'bg-slate-800 text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        title="Map View"
                    >
                        <MapIcon size={18} />
                    </button>
                </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden p-6 relative z-0">
            {viewMode === 'kanban' ? (
                <div className="flex gap-4 h-full min-w-max overflow-x-auto">
                    {groupBy === 'STATUS' && settings?.statuses.map(status => (
                        <KanbanColumn 
                            key={status.id}
                            title={status.label} 
                            leads={filteredLeads.filter(l => l.status === status.id)} 
                            count={filteredLeads.filter(l => l.status === status.id).length}
                            onCardClick={setSelectedLead}
                            color={status.color} // pass color name, component handles class
                        />
                    ))}

                    {groupBy === 'HOTNESS' && (
                        <>
                            <KanbanColumn 
                                title="🔥 Hot (80+)" 
                                leads={filteredLeads.filter(l => l.aiAnalysis && l.aiAnalysis.score >= 80)}
                                count={filteredLeads.filter(l => l.aiAnalysis && l.aiAnalysis.score >= 80).length}
                                onCardClick={setSelectedLead}
                                color="green"
                            />
                            <KanbanColumn 
                                title="☀️ Warm (50-79)" 
                                leads={filteredLeads.filter(l => l.aiAnalysis && l.aiAnalysis.score >= 50 && l.aiAnalysis.score < 80)}
                                count={filteredLeads.filter(l => l.aiAnalysis && l.aiAnalysis.score >= 50 && l.aiAnalysis.score < 80).length}
                                onCardClick={setSelectedLead}
                                color="yellow"
                            />
                            <KanbanColumn 
                                title="❄️ Cold (<50)" 
                                leads={filteredLeads.filter(l => l.aiAnalysis && l.aiAnalysis.score < 50)}
                                count={filteredLeads.filter(l => l.aiAnalysis && l.aiAnalysis.score < 50).length}
                                onCardClick={setSelectedLead}
                                color="blue"
                            />
                             <KanbanColumn 
                                title="❓ Unscored" 
                                leads={filteredLeads.filter(l => !l.aiAnalysis)}
                                count={filteredLeads.filter(l => !l.aiAnalysis).length}
                                onCardClick={setSelectedLead}
                                color="gray"
                            />
                        </>
                    )}
                </div>
            ) : viewMode === 'list' ? (
                <ListView leads={filteredLeads} onRowClick={setSelectedLead} settings={settings!} />
            ) : (
                <MapView leads={filteredLeads} onLeadClick={setSelectedLead} />
            )}
          </div>
        </div>
      )}

      {activeTab === 'finder' && (
        <LeadFinder />
      )}

      {activeTab === 'settings' && settings && (
          <SettingsPage 
            settings={settings} 
            products={products}
            onSettingsUpdate={setSettings}
            onProductsUpdate={setProducts}
          />
      )}

      {selectedLead && settings && (
        <LeadModal 
          lead={selectedLead} 
          settings={settings}
          products={products}
          isOpen={!!selectedLead} 
          onClose={() => setSelectedLead(null)} 
          onUpdate={handleLeadUpdate}
          onNext={handleNextLead}
          onPrev={handlePrevLead}
          hasNext={hasNext}
          hasPrev={hasPrev}
        />
      )}
      
    </Layout>
  );
}