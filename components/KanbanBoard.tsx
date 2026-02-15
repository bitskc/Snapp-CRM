import * as React from 'react';
import { useState } from 'react';
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
import { useCRM } from '../contexts/CRMContext';

interface KanbanBoardProps {
    leads: Lead[];
    onLeadClick: (lead: Lead) => void;
    onLeadStatusChange: (leadId: string, newStatus: LeadStatus) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ leads, onLeadClick, onLeadStatusChange }) => {
    const { settings } = useCRM();
    const [activeId, setActiveId] = useState<string | null>(null);
    const columns = settings?.statuses || [];

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            }
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
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

    const handleDragOver = (event: DragOverEvent) => { };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            return;
        }

        const activeLeadId = active.id as string;
        const overId = over.id as string;

        const activeLead = leads.find(l => l.id === activeLeadId);
        if (!activeLead) {
            setActiveId(null);
            return;
        }

        // Check if dropped on a status column
        const isStatusColumn = columns.some(s => s.id === overId);
        if (isStatusColumn) {
            if (activeLead.status !== overId) {
                onLeadStatusChange(activeLeadId, overId as LeadStatus);
            }
        }
        else {
            const overLead = leads.find(l => l.id === overId);
            if (overLead && activeLead.status !== overLead.status) {
                onLeadStatusChange(activeLeadId, overLead.status);
            }
        }

        setActiveId(null);
    };

    const getLeadsByStatus = (statusId: string) => {
        return leads.filter(l => l.status === statusId);
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
                {columns.map(status => (
                    <div key={status.id} className="snap-center w-[85vw] md:w-80 flex-shrink-0 h-full">
                        <KanbanColumn
                            id={status.id}
                            title={status.label}
                            count={getLeadsByStatus(status.id).length}
                            leads={getLeadsByStatus(status.id)}
                            onCardClick={onLeadClick}
                            color={status.color as any}
                        />
                    </div>
                ))}
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
