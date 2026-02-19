import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import {
    DndContext,
    DragOverlay,
    rectIntersection,
    pointerWithin,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    TouchSensor,
    CollisionDetection,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Lead, LeadStatus } from '../types';
import { KanbanColumn } from './KanbanColumn';
import { LeadCard } from './LeadCard';
import { useCRM } from '../contexts/CRMContext';

export type KanbanGroupBy = 'status' | 'activity_date' | 'source';

interface ColumnDef {
    id: string;
    label: string;
    color: string;
}

interface KanbanBoardProps {
    leads: Lead[];
    onLeadClick: (lead: Lead) => void;
    onLeadStatusChange: (leadId: string, newStatus: LeadStatus) => void;
    groupBy?: KanbanGroupBy;
}

// Helper: get the date bucket label for a lead's latest activity
function getActivityBucket(lead: Lead): string {
    const latestNote = lead.notes
        .slice()
        .sort((a, b) => new Date(b.activityDate || b.createdAt).getTime() - new Date(a.activityDate || a.createdAt).getTime())[0];

    if (!latestNote) return 'no_activity';

    const noteDate = new Date(latestNote.activityDate || latestNote.createdAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - noteDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays <= 7) return 'this_week';
    if (diffDays <= 14) return 'last_week';
    if (diffDays <= 30) return 'this_month';
    return 'older';
}

const ACTIVITY_COLUMNS: ColumnDef[] = [
    { id: 'today', label: 'Today', color: 'green' },
    { id: 'yesterday', label: 'Yesterday', color: 'blue' },
    { id: 'this_week', label: 'This Week', color: 'cyan' },
    { id: 'last_week', label: 'Last Week', color: 'yellow' },
    { id: 'this_month', label: 'This Month', color: 'orange' },
    { id: 'older', label: 'Older', color: 'red' },
    { id: 'no_activity', label: 'No Activity', color: 'gray' },
];

const SOURCE_COLUMNS: ColumnDef[] = [
    { id: 'MANUAL', label: 'Manual Entry', color: 'blue' },
    { id: 'AI_FINDER', label: 'AI Finder', color: 'purple' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ leads, onLeadClick, onLeadStatusChange, groupBy = 'status' }) => {
    const { settings } = useCRM();
    const [activeId, setActiveId] = useState<string | null>(null);
    const statusColumns = settings?.statuses || [];

    // Build columns based on groupBy mode
    const columns: ColumnDef[] = useMemo(() => {
        if (groupBy === 'activity_date') return ACTIVITY_COLUMNS;
        if (groupBy === 'source') return SOURCE_COLUMNS;
        return statusColumns.map(s => ({ id: s.id, label: s.label, color: s.color }));
    }, [groupBy, statusColumns]);

    const columnIds = useMemo(() => columns.map(c => c.id), [columns]);

    // Get the column id a lead belongs to, based on current groupBy
    const getLeadColumnId = useCallback((lead: Lead): string => {
        if (groupBy === 'activity_date') return getActivityBucket(lead);
        if (groupBy === 'source') return lead.source;
        return lead.status;
    }, [groupBy]);

    const getLeadsByColumn = useCallback((colId: string) => {
        return leads.filter(l => getLeadColumnId(l) === colId);
    }, [leads, getLeadColumnId]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 }
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 200, tolerance: 8 }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Custom collision detection
    const collisionDetection: CollisionDetection = useCallback((args) => {
        const pointerCollisions = pointerWithin(args);
        const columnCollision = pointerCollisions.find(c => columnIds.includes(c.id as string));
        if (columnCollision) {
            const cardCollisions = rectIntersection(args);
            const cardInColumn = cardCollisions.find(c => {
                const lead = leads.find(l => l.id === c.id);
                return lead && getLeadColumnId(lead) === columnCollision.id;
            });
            return cardInColumn ? [cardInColumn] : [columnCollision];
        }
        const rectCollisions = rectIntersection(args);
        return rectCollisions.length > 0 ? [rectCollisions[0]] : [];
    }, [columnIds, leads, getLeadColumnId]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

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

        // DnD only changes status when grouped by status
        if (groupBy === 'status') {
            let targetStatus: string | null = null;

            if (columnIds.includes(overId)) {
                targetStatus = overId;
            } else {
                const overLead = leads.find(l => l.id === overId);
                if (overLead) targetStatus = overLead.status;
                if (!targetStatus) {
                    const containerId = over.data.current?.sortable?.containerId;
                    if (containerId && columnIds.includes(containerId)) {
                        targetStatus = containerId;
                    }
                }
            }

            if (targetStatus && activeLead.status !== targetStatus) {
                onLeadStatusChange(activeLeadId, targetStatus as LeadStatus);
            }
        }

        setActiveId(null);
    };

    const activeLead = activeId ? leads.find(l => l.id === activeId) : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-row gap-4 h-full p-4 overflow-x-auto snap-x snap-mandatory touch-pan-x bg-slate-950">
                {columns.map(col => {
                    const colLeads = getLeadsByColumn(col.id);
                    return (
                        <div key={col.id} className="snap-center w-[85vw] md:w-80 flex-shrink-0 h-full">
                            <KanbanColumn
                                id={col.id}
                                title={col.label}
                                count={colLeads.length}
                                leads={colLeads}
                                onCardClick={onLeadClick}
                                color={col.color}
                            />
                        </div>
                    );
                })}
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
