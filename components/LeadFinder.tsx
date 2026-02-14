import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Plus, Loader2, Search } from 'lucide-react';
import { ChatMessage, Lead } from '../types';
import { findLeadsWithAI } from '../services/geminiService';
import { saveLead } from '../services/crmService';

interface LeadFinderProps {
  messages: ChatMessage[];
  onMessagesChange: React.Dispatch<React.SetStateAction<ChatMessage[] | any[]>>;
  query: string;
  onQueryChange: (query: string) => void;
  onLeadAdded: () => void;
}

export const LeadFinder: React.FC<LeadFinderProps> = ({
  messages,
  onMessagesChange,
  query,
  onQueryChange,
  onLeadAdded
}) => {
  // Local UI state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Thinking...');
  // Bulk selection state
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loadingText]);

  // Loading text rotation
  useEffect(() => {
    if (!isLoading) return;

    const phrases = [
      "Searching the web...",
      "Identifying potential companies...",
      "Checking websites for contact info...",
      "Filtering results...",
      "Formatting lead data...",
      "Almost there..."
    ];
    let i = 0;
    setLoadingText(phrases[0]);

    const interval = setInterval(() => {
      i = (i + 1) % phrases.length;
      setLoadingText(phrases[i]);
    }, 2500);

    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: query };
    onMessagesChange(prev => [...prev, userMsg]);
    onQueryChange('');
    setIsLoading(true);
    setSelectedLeads([]); // Clear selection on new search

    try {
      const leads = await findLeadsWithAI(userMsg.text);

      onMessagesChange(prev => {
        return [...prev, {
          id: Date.now().toString(),
          role: 'model',
          text: leads.length > 0
            ? `I found ${leads.length} companies that match your criteria.`
            : `I couldn't find any companies matching that exact request. Try broadening your search.`,
          foundLeads: leads as Lead[]
        }];
      });

    } catch (error) {
      onMessagesChange(prev => {
        return [...prev, { id: Date.now().toString(), role: 'model', text: 'Sorry, I encountered an error while searching. Please check your API key and try again.' }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLead = async (lead: Lead, msgId: string) => {
    await saveLead(lead);
    onLeadAdded(); // Refresh App Data
    const btn = document.getElementById(`btn-${lead.id}`);
    if (btn) {
      btn.innerText = "Added";
      btn.setAttribute('disabled', 'true');
      btn.className = "text-xs font-medium text-green-400 cursor-default";
    }
  };

  const handleBulkAdd = async (leads: Lead[]) => {
    setIsImporting(true);
    try {
      // Process sequentially to be safe with DB limits
      for (const lead of leads) {
        await saveLead(lead);

        // Visual update for individual cards
        const btn = document.getElementById(`btn-${lead.id}`);
        if (btn) {
          btn.innerText = "Added";
          btn.setAttribute('disabled', 'true');
          btn.className = "text-xs font-medium text-green-400 cursor-default";
        }
      }

      // Clear selection after import
      setSelectedLeads([]);
      onLeadAdded(); // Refresh App Data

      // Add a success message
      onMessagesChange(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: `Successfully added ${leads.length} leads to your CRM!`
      }]);

    } catch (e) {
      console.error("Bulk add error", e);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 relative">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900 shadow-sm z-10">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-100">
          <Search className="text-brand-400" size={20} />
          Lead Discovery Agent
        </h2>
        <p className="text-xs text-slate-500">Powered by Gemini Pro & Google Search</p>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-950">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 max-w-5xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-700 text-white' : 'bg-brand-900/50 text-brand-400 border border-brand-800'}`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>

            <div className={`flex flex-col gap-2 w-full max-w-[85%]`}>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm w-fit
                  ${msg.role === 'user'
                  ? 'bg-slate-800 text-white rounded-tr-none border border-slate-700 ml-auto'
                  : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none'}
                `}>
                {msg.text}
              </div>

              {/* Render Found Leads Cards */}
              {msg.foundLeads && msg.foundLeads.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded bg-slate-800 border-slate-600 text-brand-500 focus:ring-brand-500 cursor-pointer"
                        onChange={(e) => {
                          const allIds = msg.foundLeads!.map(l => l.id as string);
                          if (e.target.checked) {
                            setSelectedLeads(prev => [...new Set([...prev, ...allIds])]);
                          } else {
                            setSelectedLeads(prev => prev.filter(id => !allIds.includes(id)));
                          }
                        }}
                        checked={msg.foundLeads.every(l => selectedLeads.includes(l.id as string))}
                      />
                      <span className="text-xs text-slate-400 font-medium">Select All</span>
                    </div>

                    {msg.foundLeads.some(l => selectedLeads.includes(l.id as string)) && (
                      <button
                        onClick={() => handleBulkAdd(msg.foundLeads!.filter(l => selectedLeads.includes(l.id as string)) as Lead[])}
                        disabled={isImporting}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isImporting ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                        Add {selectedLeads.filter(id => msg.foundLeads!.find(l => l.id === id)).length} Selected
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {msg.foundLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className={`relative bg-slate-800 p-4 rounded-xl border shadow-sm transition-all group
                                ${selectedLeads.includes(lead.id as string) ? 'border-brand-500/50 ring-1 ring-brand-500/20' : 'border-slate-700 hover:border-slate-600'}
                            `}
                      >
                        <div className="absolute top-3 right-3">
                          <input
                            type="checkbox"
                            className="rounded bg-slate-900 border-slate-600 text-brand-500 focus:ring-brand-500 cursor-pointer w-4 h-4"
                            checked={selectedLeads.includes(lead.id as string)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLeads(prev => [...prev, lead.id as string]);
                              } else {
                                setSelectedLeads(prev => prev.filter(id => id !== lead.id));
                              }
                            }}
                          />
                        </div>

                        <div className="pr-8">
                          <h4 className="font-bold text-slate-200 line-clamp-1 text-sm">{lead.companyName}</h4>
                          <div className="flex items-center gap-2 mt-1 mb-2">
                            {lead.matchScore !== undefined && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium flex items-center gap-1
                                            ${lead.matchScore >= 80 ? 'bg-green-900/30 text-green-400 border-green-800/50' :
                                  lead.matchScore >= 50 ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50' :
                                    'bg-red-900/30 text-red-400 border-red-800/50'}
                                        `}>
                                <span className="font-bold">{lead.matchScore}%</span> Match
                              </span>
                            )}
                            <span className="text-xs text-slate-500 truncate max-w-[120px] block">{lead.location}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 mb-2 line-clamp-2 min-h-[2.5em]">
                          {lead.description}
                        </p>

                        {lead.matchReason && (
                          <div className="mb-3 p-2 bg-slate-900/50 rounded-lg border border-slate-800">
                            <p className="text-[10px] text-slate-400 italic">
                              <span className="text-brand-400 not-italic font-semibold">Why: </span>
                              {lead.matchReason}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 mt-auto">
                          {lead.website ? (
                            <a href={lead.website} target="_blank" rel="noreferrer" className="text-xs text-brand-400 hover:underline flex items-center gap-1">
                              Visit Website
                            </a>
                          ) : <span className="text-xs text-slate-600">No site</span>}

                          <button
                            id={`btn-${lead.id}`}
                            onClick={() => handleAddLead(lead as Lead, msg.id)}
                            className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
                          >
                            Add Single
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 max-w-4xl mx-auto">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-brand-900/50 text-brand-400 border border-brand-800">
              <Bot size={16} />
            </div>
            <div className="bg-slate-900 text-slate-400 border border-slate-800 rounded-2xl rounded-tl-none p-4 text-sm flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              <span className="animate-pulse">{loadingText}</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Describe the leads you want to find..."
            className="w-full pl-4 pr-12 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all shadow-sm placeholder-slate-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="absolute right-2 top-2 bottom-2 p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 disabled:hover:bg-brand-600 transition-colors"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
};