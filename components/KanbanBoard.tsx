import React, { useState } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    TouchSensor
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Lead, LeadStatus } from '../types';
import { KanbanColumn } from './KanbanColumn';
import { LeadCard } from './LeadCard';

interface KanbanBoardProps {
    leads: Lead[];
    onLeadClick: (lead: Lead) => void;
    onLeadStatusChange: (leadId: string, newStatus: LeadStatus) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ leads, onLeadClick, onLeadStatusChange }) => {
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // 5px movement required to start drag (prevents accidental clicks)
            }
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250, // Press and hold for 250ms to drag on mobile
                tolerance: 5,
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        // We can implement real-time reordering visual feedback here if needed
        // For now, simpler implementation relies on onDragEnd
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            return;
        }

        const activeLeadId = active.id as string;
        const overId = over.id as string;

        // Find the lead being dragged
        const activeLead = leads.find(l => l.id === activeLeadId);
        if (!activeLead) {
            setActiveId(null);
            return;
        }

        // Determine the new status
        // 1. If dropped directly on a Column (the droppable ID is the status)
        const columns: LeadStatus[] = ['COLD', 'WARM', 'LIVE', 'DEAD'];
        if (columns.includes(overId as LeadStatus)) {
            if (activeLead.status !== overId) {
                onLeadStatusChange(activeLeadId, overId as LeadStatus);
            }
        }
        // 2. If dropped on another Card
        else {
            // Find the lead we dropped ON
            const overLead = leads.find(l => l.id === overId);
            if (overLead && activeLead.status !== overLead.status) {
                onLeadStatusChange(activeLeadId, overLead.status);
            }
        }

        setActiveId(null);
    };

    const getLeadsByStatus = (status: LeadStatus) => {
        return leads.filter(l => l.status === status);
    };

    const activeLead = activeId ? leads.find(l => l.id === activeId) : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-row gap-4 h-full p-4 overflow-x-auto snap-x snap-mandatory touch-pan-x bg-slate-950">
                <div className="snap-center w-[85vw] md:w-80 flex-shrink-0 h-full">
                    <KanbanColumn
                        id="COLD"
                        title="COLD"
                        count={getLeadsByStatus('COLD').length}
                        leads={getLeadsByStatus('COLD')}
                        onCardClick={onLeadClick}
                        color="blue"
                    />
                </div>
                <div className="snap-center w-[85vw] md:w-80 flex-shrink-0 h-full">
                    <KanbanColumn
                        id="WARM"
                        title="WARM"
                        count={getLeadsByStatus('WARM').length}
                        leads={getLeadsByStatus('WARM')}
                        onCardClick={onLeadClick}
                        color="yellow"
                    />
                </div>
                <div className="snap-center w-[85vw] md:w-80 flex-shrink-0 h-full">
                    <KanbanColumn
                        id="LIVE"
                        title="LIVE"
                        count={getLeadsByStatus('LIVE').length}
                        leads={getLeadsByStatus('LIVE')}
                        onCardClick={onLeadClick}
                        color="green"
                    />
                </div>
                <div className="snap-center w-[85vw] md:w-80 flex-shrink-0 h-full">
                    <KanbanColumn
                        id="DEAD"
                        title="DEAD"
                        count={getLeadsByStatus('DEAD').length}
                        leads={getLeadsByStatus('DEAD')}
                        onCardClick={onLeadClick}
                        color="red"
                    />
                </div>
            </div>

            <DragOverlay>
                {activeLead ? (
                    <div className="opacity-80 rotate-2 scale-105 cursor-grabbing">
                        <LeadCard lead={activeLead} onClick={() => { }} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
