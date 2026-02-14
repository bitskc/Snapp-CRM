import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Plus, Loader2, Search } from 'lucide-react';
import { ChatMessage, Lead } from '../types';
import { findLeadsWithAI } from '../services/geminiService';
import { saveLead } from '../services/crmService';

export const LeadFinder: React.FC = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hello! I can help you find new leads. Try asking: "Find 10 HVAC companies in Dallas that might use Service Titan".',
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Thinking...');
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
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setIsLoading(true);

    try {
      const leads = await findLeadsWithAI(userMsg.text);
      
      setMessages(prev => {
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
       setMessages(prev => {
        return [...prev, { id: Date.now().toString(), role: 'model', text: 'Sorry, I encountered an error while searching. Please check your API key and try again.' }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLead = async (lead: Lead, msgId: string) => {
    await saveLead(lead);
    const btn = document.getElementById(`btn-${lead.id}`);
    if (btn) {
        btn.innerText = "Added";
        btn.setAttribute('disabled', 'true');
        btn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-green-800 bg-green-900/30 text-xs font-medium text-green-400 cursor-default";
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
          <div key={msg.id} className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-700 text-white' : 'bg-brand-900/50 text-brand-400 border border-brand-800'}`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={`flex flex-col gap-2 max-w-[80%]`}>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm
                  ${msg.role === 'user' 
                    ? 'bg-slate-800 text-white rounded-tr-none border border-slate-700' 
                    : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none'}
                `}>
                  {msg.text}
                </div>

                {/* Render Found Leads Cards */}
                {msg.foundLeads && msg.foundLeads.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {msg.foundLeads.map((lead) => (
                      <div key={lead.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm hover:border-slate-600 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-slate-200 line-clamp-1" title={lead.companyName}>{lead.companyName}</h4>
                        </div>
                        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                            <span className="truncate">{lead.location}</span>
                        </p>
                        <p className="text-xs text-slate-400 mb-4 line-clamp-2 h-8">
                            {lead.description}
                        </p>
                        
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-700">
                            {lead.website ? (
                                <a href={lead.website} target="_blank" rel="noreferrer" className="text-xs text-brand-400 hover:underline">
                                    Visit Website
                                </a>
                            ) : <span className="text-xs text-slate-600">No site</span>}
                            
                            <button
                                id={`btn-${lead.id}`}
                                onClick={() => handleAddLead(lead, msg.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-600 bg-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-600 transition-colors"
                            >
                                <Plus size={14} /> Add to CRM
                            </button>
                        </div>
                      </div>
                    ))}
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
            onChange={(e) => setQuery(e.target.value)}
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