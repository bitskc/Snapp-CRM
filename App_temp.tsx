export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'finder' | 'settings'>('dashboard');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

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
        <div className="flex flex-col h-full bg-slate-950">
          {/* Dashboard Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
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

            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto relative z-20">
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

              <div className="relative">
                <button
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all whitespace-nowrap
                        ${sourceFilter !== 'ALL'
                      ? 'bg-brand-900/30 text-brand-400 border-brand-800'
                      : 'text-slate-400 hover:bg-slate-900 border-transparent hover:border-slate-800'}
                        `}
                >
                  <Filter size={16} /> Filter <ChevronDown size={14} />
                </button>

                {isFilterMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 z-50">
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
                >
                  <Kanban size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-slate-800 text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden p-6 relative z-0">
            {viewMode === 'kanban' ? (
              <div className="flex gap-4 h-full min-w-max overflow-x-auto">
                <KanbanColumn
                  status={'COLD'}
                  leads={filteredLeads.filter(l => l.status === 'COLD')}
                  onCardClick={setSelectedLead}
                  color="border-blue-500"
                />
                <KanbanColumn
                  status={'WARM'}
                  leads={filteredLeads.filter(l => l.status === 'WARM')}
                  onCardClick={setSelectedLead}
                  color="border-yellow-500"
                />
                <KanbanColumn
                  status={'LIVE'}
                  leads={filteredLeads.filter(l => l.status === 'LIVE')}
                  onCardClick={setSelectedLead}
                  color="border-green-500"
                />
                <KanbanColumn
                  status={'DEAD'}
                  leads={filteredLeads.filter(l => l.status === 'DEAD')}
                  onCardClick={setSelectedLead}
                  color="border-red-500"
                />
              </div>
            ) : (
              <ListView leads={filteredLeads} onRowClick={setSelectedLead} />
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