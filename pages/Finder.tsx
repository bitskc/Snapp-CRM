import * as React from 'react';
import { LeadFinder } from '../components/LeadFinder';
import { useCRM } from '../contexts/CRMContext';

export const FinderPage: React.FC = () => {
    const {
        finderMessages,
        setFinderMessages,
        finderQuery,
        setFinderQuery,
        refreshData
    } = useCRM();

    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col">
            <LeadFinder
                messages={finderMessages}
                onMessagesChange={setFinderMessages}
                query={finderQuery}
                onQueryChange={setFinderQuery}
            />
        </div>
    );
};
