import React, { useState, useMemo } from 'react';
import { Search, Filter, RefreshCw, List, Kanban, CalendarClock, ChevronDown, Map as MapIcon, Upload } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { useClickOutside } from '../hooks/useClickOutside';
import { KanbanBoard } from '../components/KanbanBoard';
import { ListView } from '../components/ListView';
import { MapView } from '../components/MapView';
import { LeadModal } from '../components/LeadModal';
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
        updateLeadStatus
    } = useCRM();

    // Local state scoped to this page
    const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'map'>('kanban');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [searchFilter, setSearchFilter] = useState('');
    const debouncedSearch = useDebounce(searchFilter, 300);
    const [needsContactFilter, setNeedsContactFilter] = useState(false);
    const [sourceFilter, setSourceFilter] = useState<'ALL' | 'MANUAL' | 'AI'>('ALL');
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const filterMenuRef = React.useRef<HTMLDivElement>(null);
    useClickOutside(filterMenuRef, () => setIsFilterMenuOpen(false));

    const filteredLeads = useMemo(() => {
        return leads.filter(l => {
            const matchesSearch = l.companyName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                l.description?.toLowerCase().includes(debouncedSearch.toLowerCase());

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
    }, [leads, debouncedSearch, needsContactFilter, sourceFilter]);

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
                    ${sourceFilter !== 'ALL'
                                    ? 'bg-brand-900/30 text-brand-400 border-brand-800'
                                    : 'text-slate-400 hover:bg-slate-900 border-transparent hover:border-slate-800'}
                    `}
                        >
                            <Filter size={16} /> Filter <ChevronDown size={14} />
                        </button>

                        {isFilterMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 z-[60]">
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
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden p-6 relative z-0 h-full">
                {viewMode === 'kanban' && (
                    <KanbanBoard
                        leads={filteredLeads}
                        onLeadClick={setSelectedLead}
                        onLeadStatusChange={updateLeadStatus}
                    />
                )}
                {viewMode === 'list' && (
                    <ListView leads={filteredLeads} onRowClick={setSelectedLead} settings={settings!} />
                )}
                {viewMode === 'map' && (
                    <MapView leads={filteredLeads} onLeadClick={setSelectedLead} />
                )}
            </div>

            {selectedLead && settings && (
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
