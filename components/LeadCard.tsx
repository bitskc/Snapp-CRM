import React from 'react';
import { Lead } from '../types';
import { MoreHorizontal, Flame } from 'lucide-react';

interface LeadCardProps {
    lead: Lead;
    onClick: (lead: Lead) => void;
    style?: React.CSSProperties;
    innerRef?: React.Ref<HTMLDivElement>;
    attributes?: any;
    listeners?: any;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onClick, style, innerRef, attributes, listeners }) => {
    return (
        <div
            ref={innerRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(lead)}
            className="bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-700 hover:shadow-md hover:border-brand-500/50 transition-all cursor-pointer group touch-manipulation"
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-slate-200 line-clamp-1 group-hover:text-brand-400 transition-colors">
                    {lead.companyName}
                </h4>
                <MoreHorizontal size={16} className="text-slate-500 hover:text-slate-300" />
            </div>

            <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                {lead.description || 'No description available'}
            </p>

            {lead.matchReason && (
                <p className="text-[10px] text-slate-500 mb-3 line-clamp-2 italic border-l-2 border-slate-700 pl-2">
                    "{lead.matchReason}"
                </p>
            )}

            <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-1.5">
                    {lead.source === 'AI_FINDER' && (
                        <span className="text-[10px] bg-purple-900/30 text-purple-400 px-1.5 py-0.5 rounded border border-purple-800/50 font-medium">AI Found</span>
                    )}
                    {(lead.aiAnalysis?.score !== undefined || lead.matchScore !== undefined) && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium flex items-center gap-1
            ${(lead.aiAnalysis?.score ?? lead.matchScore ?? 0) >= 80 ? 'bg-green-900/30 text-green-400 border-green-800/50' :
                                (lead.aiAnalysis?.score ?? lead.matchScore ?? 0) >= 50 ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50' :
                                    'bg-red-900/30 text-red-400 border-red-800/50'
                            }
         `}>
                            <Flame size={10} /> {lead.aiAnalysis?.score ?? lead.matchScore}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">
                        {new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    {lead.notes.length > 0 && (
                        <span className="text-[10px] bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded border border-slate-800">
                            {lead.notes.length} notes
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
