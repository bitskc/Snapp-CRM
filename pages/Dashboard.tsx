import React, { useState, useMemo } from 'react';
import { Search, Filter, RefreshCw, List, Kanban, CalendarClock, ChevronDown, Map as MapIcon, Upload, X, Layers } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { useClickOutside } from '../hooks/useClickOutside';
import { KanbanBoard } from '../components/KanbanBoard';
import { ListView } from '../components/ListView';
import { MapView } from '../components/MapView';
import { LeadModal } from '../components/LeadModal';
import { LeadSidebar } from '../components/LeadSidebar';
import { ImportModal } from '../components/ImportModal';
import { Lead, AppSettings, Product, LeadStatus } from '../types';

import { useCRM } from '../contexts/CRMContext';

export const DashboardPage: React.FC = () => {
    const {
        leads,
        totalLeads,
        settings,
        products,
        isLoading,
        refreshData,
        loadMore,
        hasMore,
        updateLead,
        updateLeadStatus,
        deleteLead
    } = useCRM();

    // Local state scoped to this page
    const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'map'>('kanban');
    const [kanbanGroupBy, setKanbanGroupBy] = useState<'status' | 'activity_date' | 'source'>('status');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [searchFilter, setSearchFilter] = useState('');
    const debouncedSearch = useDebounce(searchFilter, 300);
    const [needsContactFilter, setNeedsContactFilter] = useState(false);
    const [sourceFilter, setSourceFilter] = useState<'ALL' | 'MANUAL' | 'AI'>('ALL');
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [productFilter, setProductFilter] = useState<string[]>([]);
    const [locationFilter, setLocationFilter] = useState('');
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const filterMenuRef = React.useRef<HTMLDivElement>(null);
    useClickOutside(filterMenuRef, () => setIsFilterMenuOpen(false));

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (sourceFilter !== 'ALL') count++;
        if (statusFilter.length > 0) count++;
        if (productFilter.length > 0) count++;
        if (locationFilter) count++;
        return count;
    }, [sourceFilter, statusFilter, productFilter, locationFilter]);

    const clearAllFilters = () => {
        setSourceFilter('ALL');
        setStatusFilter([]);
        setProductFilter([]);
        setLocationFilter('');
    };

    // Build unique locations from leads for the location filter
    const uniqueLocations = useMemo(() => {
        const locs = new Set<string>();
        leads.forEach(l => {
            if (l.location) {
                // Extract state/city-level grouping from location string
                const parts = l.location.split(',').map(p => p.trim());
                if (parts.length >= 2) {
                    // Use last two parts (usually city, state or state, country)
                    locs.add(parts.slice(-2).join(', '));
                }
                locs.add(l.location);
            }
        });
        return Array.from(locs).sort();
    }, [leads]);

    const filteredLeads = useMemo(() => {
        const searchLower = debouncedSearch.toLowerCase();
        return leads.filter(l => {
            const matchesSearch = !searchLower ||
                l.companyName.toLowerCase().includes(searchLower) ||
                l.description?.toLowerCase().includes(searchLower) ||
                l.contactName?.toLowerCase().includes(searchLower) ||
                l.email?.toLowerCase().includes(searchLower) ||
                l.location?.toLowerCase().includes(searchLower);

            let matchesNeedsContact = true;
            if (needsContactFilter) {
                const today = new Date().toDateString();
                const contactedToday = l.notes.some(n => new Date(n.createdAt).toDateString() === today);
                matchesNeedsContact = !contactedToday && l.status !== 'DEAD';
            }

            let matchesSource = true;
            if (sourceFilter === 'MANUAL') matchesSource = l.source === 'MANUAL';
            if (sourceFilter === 'AI') matchesSource = l.source === 'AI_FINDER';

            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(l.status);

            const matchesProduct = productFilter.length === 0 ||
                productFilter.some(pid => (l.productIds || []).includes(pid));

            const matchesLocation = !locationFilter ||
                (l.location && l.location.toLowerCase().includes(locationFilter.toLowerCase()));

            return matchesSearch && matchesNeedsContact && matchesSource && matchesStatus && matchesProduct && matchesLocation;
        });
    }, [leads, debouncedSearch, needsContactFilter, sourceFilter, statusFilter, productFilter, locationFilter]);

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
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-950">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">

                {/* Search Bar */}
                <div className="flex items-center gap-4 w-full xl:w-auto flex-1">
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
                    <button onClick={() => refreshData()} className="p-2 text-slate-500 hover:text-brand-400 hover:bg-slate-900 rounded-lg transition-colors flex-shrink-0" title="Refresh" aria-label="Refresh leads">
                        <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                    </button>
                    {hasMore && (
                        <button
                            onClick={loadMore}
                            disabled={isLoading}
                            className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-all disabled:opacity-50"
                        >
                            {isLoading ? "Loading..." : `Load More (${leads.length}/${totalLeads})`}
                        </button>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">

                    <button
                        onClick={() => setNeedsContactFilter(!needsContactFilter)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all whitespace-nowrap flex-grow justify-center xl:flex-grow-0
                ${needsContactFilter
                                ? 'bg-brand-900/30 text-brand-400 border-brand-800'
                                : 'text-slate-400 hover:bg-slate-900 border-transparent hover:border-slate-800'}
              `}
                    >
                        <CalendarClock size={16} /> <span className="hidden sm:inline">Needs Contact Today</span><span className="sm:hidden">Today</span>
                    </button>

                    <div className="relative" ref={filterMenuRef}>
                        <button
                            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all whitespace-nowrap
                    ${activeFilterCount > 0
                                    ? 'bg-brand-900/30 text-brand-400 border-brand-800'
                                    : 'text-slate-400 hover:bg-slate-900 border-transparent hover:border-slate-800'}
                    `}
                        >
                            <Filter size={16} /> Filter {activeFilterCount > 0 && <span className="bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>} <ChevronDown size={14} />
                        </button>

                        {isFilterMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 z-[60] max-h-[70vh] overflow-y-auto custom-scrollbar">
                                {activeFilterCount > 0 && (
                                    <button
                                        onClick={clearAllFilters}
                                        className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-slate-800 flex items-center gap-1.5"
                                    >
                                        <X size={12} /> Clear all filters
                                    </button>
                                )}

                                {/* Status Filter */}
                                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase border-t border-slate-800">Status</div>
                                {settings?.statuses.map(s => (
                                    <label key={s.id} className="flex items-center gap-2 px-4 py-1.5 hover:bg-slate-800 cursor-pointer text-sm text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={statusFilter.includes(s.id)}
                                            onChange={() => setStatusFilter(prev =>
                                                prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                                            )}
                                            className="accent-brand-500"
                                        />
                                        {s.label}
                                    </label>
                                ))}

                                {/* Product Filter */}
                                {products.length > 0 && (
                                    <>
                                        <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase border-t border-slate-800">Product</div>
                                        {products.map(p => (
                                            <label key={p.id} className="flex items-center gap-2 px-4 py-1.5 hover:bg-slate-800 cursor-pointer text-sm text-slate-300">
                                                <input
                                                    type="checkbox"
                                                    checked={productFilter.includes(p.id)}
                                                    onChange={() => setProductFilter(prev =>
                                                        prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                                    )}
                                                    className="accent-brand-500"
                                                />
                                                <span className="truncate">{p.name}</span>
                                            </label>
                                        ))}
                                    </>
                                )}

                                {/* Location Filter */}
                                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase border-t border-slate-800">Location</div>
                                <div className="px-3 pb-2">
                                    <input
                                        type="text"
                                        placeholder="Type to filter..."
                                        value={locationFilter}
                                        onChange={(e) => setLocationFilter(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-slate-200 outline-none focus:border-brand-500 placeholder-slate-600"
                                    />
                                </div>
                                {locationFilter === '' && uniqueLocations.slice(0, 8).map(loc => (
                                    <button
                                        key={loc}
                                        onClick={() => setLocationFilter(loc)}
                                        className="w-full text-left px-4 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 truncate"
                                    >
                                        {loc}
                                    </button>
                                ))}

                                {/* Source Filter */}
                                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase border-t border-slate-800">Source</div>
                                <button
                                    onClick={() => setSourceFilter('ALL')}
                                    className={`w-full text-left px-4 py-1.5 text-sm ${sourceFilter === 'ALL' ? 'text-brand-400 bg-slate-800' : 'text-slate-300 hover:bg-slate-800'}`}
                                >
                                    All Sources
                                </button>
                                <button
                                    onClick={() => setSourceFilter('MANUAL')}
                                    className={`w-full text-left px-4 py-1.5 text-sm ${sourceFilter === 'MANUAL' ? 'text-brand-400 bg-slate-800' : 'text-slate-300 hover:bg-slate-800'}`}
                                >
                                    Manual Entry
                                </button>
                                <button
                                    onClick={() => setSourceFilter('AI')}
                                    className={`w-full text-left px-4 py-1.5 text-sm ${sourceFilter === 'AI' ? 'text-brand-400 bg-slate-800' : 'text-slate-300 hover:bg-slate-800'}`}
                                >
                                    AI Finder
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all whitespace-nowrap"
                    >
                        <Upload size={16} /> <span className="hidden sm:inline">Import</span>
                    </button>

                    <div className="h-6 w-px bg-slate-800 mx-1 hidden xl:block"></div>

                    <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 ml-auto xl:ml-0">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-1.5 rounded transition-all ${viewMode === 'kanban' ? 'bg-slate-800 text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            title="Kanban Board"
                            aria-label="Switch to Kanban View"
                            aria-pressed={viewMode === 'kanban'}
                        >
                            <Kanban size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-slate-800 text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            title="List View"
                            aria-label="Switch to List View"
                            aria-pressed={viewMode === 'list'}
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={`p-1.5 rounded transition-all ${viewMode === 'map' ? 'bg-slate-800 text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            title="Map View"
                            aria-label="Switch to Map View"
                            aria-pressed={viewMode === 'map'}
                        >
                            <MapIcon size={18} />
                        </button>
                    </div>

                    {viewMode === 'kanban' && (
                        <div className="flex items-center gap-1.5">
                            <Layers size={14} className="text-slate-500" />
                            <select
                                value={kanbanGroupBy}
                                onChange={(e) => setKanbanGroupBy(e.target.value as 'status' | 'activity_date' | 'source')}
                                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                            >
                                <option value="status">Group by Status</option>
                                <option value="activity_date">Group by Activity</option>
                                <option value="source">Group by Source</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden p-6 relative z-0 h-full">
                {viewMode === 'kanban' && (
                    <KanbanBoard
                        leads={filteredLeads}
                        onLeadClick={setSelectedLead}
                        onLeadStatusChange={updateLeadStatus}
                        groupBy={kanbanGroupBy}
                    />
                )}
                {viewMode === 'list' && (
                    <div className="flex h-full gap-0">
                        <div className={`${selectedLead ? 'flex-1 min-w-0' : 'w-full'} transition-all`}>
                            <ListView
                                leads={filteredLeads}
                                onRowClick={setSelectedLead}
                                settings={settings!}
                                onDeleteLeads={(ids) => ids.forEach(id => deleteLead(id))}
                                onUpdateLeadStatuses={(ids, status) => ids.forEach(id => updateLeadStatus(id, status))}
                                activeLead={selectedLead}
                            />
                        </div>
                        {selectedLead && settings && (
                            <div className="w-[420px] flex-shrink-0 border-l border-slate-800 overflow-y-auto custom-scrollbar bg-slate-900">
                                <LeadSidebar
                                    lead={selectedLead}
                                    onClose={() => setSelectedLead(null)}
                                />
                            </div>
                        )}
                    </div>
                )}
                {viewMode === 'map' && (
                    <MapView leads={filteredLeads} onLeadClick={setSelectedLead} />
                )}
            </div>

            {selectedLead && settings && viewMode !== 'list' && (
                <LeadModal
                    lead={selectedLead}
                    isOpen={!!selectedLead}
                    onClose={() => setSelectedLead(null)}
                    onNext={handleNextLead}
                    onPrev={handlePrevLead}
                    hasNext={hasNext}
                    hasPrev={hasPrev}
                />
            )}

            {isImportModalOpen && (
                <ImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                />
            )}

        </div>
    );
};
