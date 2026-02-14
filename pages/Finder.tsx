import React from 'react';
import { LeadFinder } from '../components/LeadFinder';
import { ChatMessage, Lead } from '../types';

interface FinderProps {
    messages: ChatMessage[];
    onMessagesChange: React.Dispatch<React.SetStateAction<ChatMessage[] | any[]>>; // Consistent with LeadFinder prop
    query: string;
    onQueryChange: (q: string) => void;
    onLeadAdded: () => Promise<void>;
}

export const FinderPage: React.FC<FinderProps> = ({
    messages,
    onMessagesChange,
    query,
    onQueryChange,
    onLeadAdded
}) => {
    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col">
            <LeadFinder
                messages={messages}
                onMessagesChange={onMessagesChange}
                query={query}
                onQueryChange={onQueryChange}
                onLeadAdded={onLeadAdded}
            />
        </div>
    );
};
