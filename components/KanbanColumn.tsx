import React from 'react';
import { Lead } from '../types';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableLeadCard } from './SortableLeadCard';

interface KanbanColumnProps {
    title: string;
    id: string; // Add ID for droppable
    count: number;
    leads: Lead[];
    onCardClick: (lead: Lead) => void;
    color: string;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
    title,
    id,
    count,
    leads,
    onCardClick,
    color
}) => {
    // Convert color name (e.g. 'blue') to actual tailwind classes safely
    const borderClass = color.startsWith('border-') ? color : `border-${color}-500`;

    const { setNodeRef } = useDroppable({
        id: id,
    });

    return (
        <div className="flex-1 min-w-[280px] bg-slate-900/50 rounded-xl p-3 flex flex-col h-full border border-slate-800/60">
            <div className={`flex items-center justify-between mb-4 pb-2 border-b ${borderClass}`}>
                <h3 className="font-semibold text-slate-300 text-sm tracking-wide uppercase">{title}</h3>
                <span className="bg-slate-800 px-2 py-0.5 rounded-full text-xs font-bold text-slate-400 shadow-sm border border-slate-700">
                    {count}
                </span>
            </div>

            <div ref={setNodeRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-4">
                <SortableContext
                    id={id}
                    items={leads.map(l => l.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {leads.map(lead => (
                        <SortableLeadCard
                            key={lead.id}
                            lead={lead}
                            onClick={onCardClick}
                        />
                    ))}
                </SortableContext>

                {leads.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-slate-800 rounded-lg flex items-center justify-center text-slate-600 text-xs">
                        Drop items here
                    </div>
                )}
            </div>
        </div>
    );
};
