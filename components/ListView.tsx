import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, Trash2, Columns } from 'lucide-react';
import { Lead, AppSettings } from '../types';
import { useClickOutside } from '../hooks/useClickOutside';

interface ColumnDef {
    key: string;
    label: string;
    sortField?: string;
    width: string;
    render: (lead: Lead, settings: AppSettings) => React.ReactNode;
}

const ALL_COLUMNS: ColumnDef[] = [
    {
        key: 'companyName',
        label: 'Company',
        sortField: 'companyName',
        width: '2fr',
        render: (lead) => <span className="font-medium text-slate-200 truncate">{lead.companyName}</span>,
    },
    {
        key: 'contactName',
        label: 'Contact',
        sortField: 'contactName',
        width: '1.5fr',
        render: (lead) => <span className="text-slate-400 truncate">{lead.contactName || '-'}</span>,
    },
    {
        key: 'email',
        label: 'Email',
        sortField: 'email',
        width: '2fr',
        render: (lead) => <span className="text-slate-400 truncate">{lead.email || '-'}</span>,
    },
    {
        key: 'phone',
        label: 'Phone',
        sortField: 'phone',
        width: '1.5fr',
        render: (lead) => <span className="text-slate-400 truncate">{lead.phone || '-'}</span>,
    },
    {
        key: 'website',
        label: 'Website',
        sortField: 'website',
        width: '2fr',
        render: (lead) => <span className="text-slate-400 truncate">{lead.website || '-'}</span>,
    },
    {
        key: 'status',
        label: 'Status',
        sortField: 'status',
        width: '120px',
        render: (lead, settings) => {
            const statusConfig = settings.statuses.find(s => s.id === lead.status);
            return (
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide
                    ${statusConfig?.color === 'blue' ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50' : ''}
                    ${statusConfig?.color === 'yellow' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50' : ''}
                    ${statusConfig?.color === 'green' ? 'bg-green-900/30 text-green-400 border border-green-800/50' : ''}
                    ${statusConfig?.color === 'red' ? 'bg-red-900/30 text-red-400 border border-red-800/50' : ''}
                    ${!statusConfig ? 'bg-slate-800 text-slate-400' : ''}
                `}>
                    {statusConfig?.label || lead.status}
                </span>
            );
        },
    },
    {
        key: 'location',
        label: 'Location',
        sortField: 'location',
        width: '2fr',
        render: (lead) => <span className="text-slate-400 truncate">{lead.location || '-'}</span>,
    },
    {
        key: 'description',
        label: 'Description',
        sortField: 'description',
        width: '3fr',
        render: (lead) => <span className="text-slate-500 truncate text-xs">{lead.description || '-'}</span>,
    },
    {
        key: 'source',
        label: 'Source',
        sortField: 'source',
        width: '100px',
        render: (lead) => <span className="text-slate-400 text-xs">{lead.source === 'AI_FINDER' ? 'AI' : 'Manual'}</span>,
    },
    {
        key: 'lastNote',
        label: 'Last Note',
        width: '2fr',
        render: (lead) => {
            const lastNote = lead.notes[lead.notes.length - 1];
            return <span className="text-slate-500 truncate text-xs">{lastNote ? lastNote.content : <span className="text-slate-700 italic">No notes</span>}</span>;
        },
    },
    {
        key: 'createdAt',
        label: 'Added',
        sortField: 'createdAt',
        width: '100px',
        render: (lead) => <span className="text-slate-600 text-xs">{new Date(lead.createdAt).toLocaleDateString()}</span>,
    },
];

const DEFAULT_COLUMNS = ['companyName', 'contactName', 'status', 'lastNote', 'createdAt'];

type SortDir = 'asc' | 'desc';

interface ListViewProps {
    leads: Lead[];
    onRowClick: (lead: Lead) => void;
    settings: AppSettings;
    onDeleteLeads: (leadIds: string[]) => void;
    onUpdateLeadStatuses: (leadIds: string[], status: string) => void;
    activeLead?: Lead | null;
}

export const ListView: React.FC<ListViewProps> = ({ leads, onRowClick, settings, onDeleteLeads, onUpdateLeadStatuses, activeLead }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [sortField, setSortField] = useState<string>('companyName');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('listview-columns');
        return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
    });
    const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
    const selectAllRef = useRef<HTMLInputElement>(null);
    const columnPickerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useClickOutside(columnPickerRef as React.RefObject<HTMLDivElement>, useCallback(() => setIsColumnPickerOpen(false), []));

    useEffect(() => {
        localStorage.setItem('listview-columns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    const activeColumns = useMemo(() =>
        visibleColumns.map(key => ALL_COLUMNS.find(c => c.key === key)).filter(Boolean) as ColumnDef[],
        [visibleColumns]
    );

    const gridTemplate = `40px ${activeColumns.map(c => c.width).join(' ')}`;

    const leadsFingerprint = `${leads.length}-${leads[0]?.id}-${leads[leads.length - 1]?.id}`;
    const sortedLeads = useMemo(() => {
        return [...leads].sort((a, b) => {
            let cmp = 0;
            if (sortField === 'createdAt') {
                cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            } else {
                const aVal = String((a as any)[sortField] || '').toLowerCase();
                const bVal = String((b as any)[sortField] || '').toLowerCase();
                cmp = aVal.localeCompare(bVal);
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leadsFingerprint, sortField, sortDir]);

    // Keep selectedIds in sync with available leads
    useEffect(() => {
        const leadIdSet = new Set(leads.map(l => l.id));
        setSelectedIds(prev => {
            const next = new Set([...prev].filter(id => leadIdSet.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }, [leads]);

    // Manage indeterminate state on the select-all checkbox
    useEffect(() => {
        if (selectAllRef.current) {
            const allSelected = sortedLeads.length > 0 && selectedIds.size === sortedLeads.length;
            const someSelected = selectedIds.size > 0 && !allSelected;
            selectAllRef.current.indeterminate = someSelected;
        }
    }, [selectedIds, sortedLeads.length]);

    // Keyboard navigation for sidebar mode
    useEffect(() => {
        if (!activeLead) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
            e.preventDefault();
            const currentIndex = sortedLeads.findIndex(l => l.id === activeLead.id);
            if (currentIndex === -1) return;
            const nextIndex = e.key === 'ArrowDown'
                ? Math.min(currentIndex + 1, sortedLeads.length - 1)
                : Math.max(currentIndex - 1, 0);
            if (nextIndex === currentIndex) return;
            onRowClick(sortedLeads[nextIndex]);
            const row = listRef.current?.querySelector(`[data-lead-id="${sortedLeads[nextIndex].id}"]`);
            row?.scrollIntoView({ block: 'nearest' });
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [activeLead, sortedLeads, onRowClick]);

    const allSelected = sortedLeads.length > 0 && selectedIds.size === sortedLeads.length;

    const handleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(sortedLeads.map(l => l.id)));
        }
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const handleBulkDelete = () => {
        onDeleteLeads([...selectedIds]);
        setSelectedIds(new Set());
    };

    const handleBulkStatusChange = (status: string) => {
        onUpdateLeadStatuses([...selectedIds], status);
        setSelectedIds(new Set());
    };

    const toggleColumn = (key: string) => {
        if (key === 'companyName') return;
        setVisibleColumns(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const SortableHeader: React.FC<{ field: string; label: string; className?: string }> = ({ field, label, className }) => (
        <button
            onClick={() => handleSort(field)}
            className={`flex items-center gap-1 select-none cursor-pointer hover:text-slate-200 transition-colors ${className || ''}`}
        >
            {label}
            {sortField === field && (
                sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
            )}
        </button>
    );

    return (
        <div className="w-full h-full overflow-hidden bg-slate-900 rounded-xl border border-slate-800 shadow-sm flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 pt-3 gap-3">
                <div className="flex-1">
                    {selectedIds.size > 0 && (
                        <div className="bg-brand-900/20 border border-brand-800/50 rounded-lg p-3 flex items-center gap-3 flex-wrap">
                            <span className="text-sm text-slate-300 font-medium">{selectedIds.size} selected</span>
                            <button
                                onClick={handleBulkDelete}
                                className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                            </button>
                            {settings.statuses.map(status => (
                                <button
                                    key={status.id}
                                    onClick={() => handleBulkStatusChange(status.id)}
                                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    {status.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="relative" ref={columnPickerRef}>
                    <button
                        onClick={() => setIsColumnPickerOpen(prev => !prev)}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Columns className="w-3.5 h-3.5" />
                        Columns
                    </button>
                    {isColumnPickerOpen && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-2 z-50">
                            {ALL_COLUMNS.map(col => (
                                <label key={col.key} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 cursor-pointer text-sm text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={visibleColumns.includes(col.key)}
                                        disabled={col.key === 'companyName'}
                                        onChange={() => toggleColumn(col.key)}
                                        className="accent-brand-500"
                                    />
                                    {col.label}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Header */}
            <div
                className="grid gap-4 px-6 py-3 border-b border-slate-800 bg-slate-900/50 text-xs font-semibold text-slate-400 uppercase tracking-wider items-center"
                style={{ gridTemplateColumns: gridTemplate }}
            >
                <div>
                    <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allSelected}
                        onChange={handleSelectAll}
                        className="accent-brand-500 w-4 h-4 rounded cursor-pointer"
                    />
                </div>
                {activeColumns.map(col => (
                    <div key={col.key}>
                        {col.sortField ? (
                            <SortableHeader field={col.sortField} label={col.label} />
                        ) : (
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{col.label}</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto custom-scrollbar" ref={listRef}>
                {sortedLeads.map(lead => {
                    const isSelected = selectedIds.has(lead.id);
                    const isActive = activeLead?.id === lead.id;

                    return (
                        <div
                            key={lead.id}
                            data-lead-id={lead.id}
                            onClick={() => onRowClick(lead)}
                            className={`grid gap-4 px-6 py-4 border-b border-slate-800/50 items-center hover:bg-slate-800/50 cursor-pointer transition-colors text-sm
                                ${isActive ? 'bg-brand-900/20 border-l-2 border-l-brand-500' : ''}
                                ${isSelected && !isActive ? 'bg-slate-800/80' : ''}
                            `}
                            style={{ gridTemplateColumns: gridTemplate }}
                        >
                            <div>
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelect(lead.id)}
                                    onClick={e => e.stopPropagation()}
                                    className="accent-brand-500 w-4 h-4 rounded cursor-pointer"
                                />
                            </div>
                            {activeColumns.map(col => (
                                <div key={col.key} className="truncate">
                                    {col.render(lead, settings)}
                                </div>
                            ))}
                        </div>
                    );
                })}
                {sortedLeads.length === 0 && (
                    <div className="p-8 text-center text-slate-500">No leads found matching criteria.</div>
                )}
            </div>
        </div>
    );
};
