import React from 'react';
import { Lead, AppSettings } from '../types';

interface ListViewProps {
    leads: Lead[];
    onRowClick: (lead: Lead) => void;
    settings: AppSettings;
}

export const ListView: React.FC<ListViewProps> = ({ leads, onRowClick, settings }) => {
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
                                   ${statusConfig?.color === 'blue' ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50' : ''}
                                   ${statusConfig?.color === 'yellow' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50' : ''}
                                   ${statusConfig?.color === 'green' ? 'bg-green-900/30 text-green-400 border border-green-800/50' : ''}
                                   ${statusConfig?.color === 'red' ? 'bg-red-900/30 text-red-400 border border-red-800/50' : ''}
                                   ${!statusConfig ? 'bg-slate-800 text-slate-400' : ''}
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
