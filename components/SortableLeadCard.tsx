import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Lead } from '../types';
import { LeadCard } from './LeadCard';

interface SortableLeadCardProps {
    lead: Lead;
    onClick: (lead: Lead) => void;
}

export const SortableLeadCard: React.FC<SortableLeadCardProps> = ({ lead, onClick }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: lead.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <LeadCard
            lead={lead}
            onClick={onClick}
            style={style}
            innerRef={setNodeRef}
            attributes={attributes}
            listeners={listeners}
        />
    );
};
