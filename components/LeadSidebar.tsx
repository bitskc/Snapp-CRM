import * as React from 'react';
import { useState, useEffect } from 'react';
import { X, MapPin, Phone, Mail, Globe, Send, Loader2, Tag } from 'lucide-react';
import { Lead, Note } from '../types';
import { addNoteToLead } from '../services/crmService';
import { useCRM } from '../contexts/CRMContext';

interface LeadSidebarProps {
  lead: Lead;
  onClose: () => void;
}

export const LeadSidebar: React.FC<LeadSidebarProps> = ({ lead, onClose }) => {
  const { settings, products, updateLead, addToast } = useCRM();
  const [activeLead, setActiveLead] = useState<Lead>(lead);
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setActiveLead(lead);
    setNewNote('');
  }, [lead]);

  const handleStatusChange = async (newStatus: string) => {
    const updated = { ...activeLead, status: newStatus };
    setActiveLead(updated);
    await updateLead(updated);
  };

  const handleToggleProduct = async (productId: string) => {
    const currentIds = activeLead.productIds || [];
    const newIds = currentIds.includes(productId)
      ? currentIds.filter(id => id !== productId)
      : [...currentIds, productId];

    const updated = { ...activeLead, productIds: newIds };
    setActiveLead(updated);
    await updateLead(updated);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSaving(true);
    try {
      const note = await addNoteToLead(activeLead.id, newNote);
      const updated = { ...activeLead, notes: [...activeLead.notes, note] };
      setActiveLead(updated);
      await updateLead(updated);
      setNewNote('');
    } catch (e) {
      console.error("Failed to add note", e);
      addToast("Failed to add note", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColorClasses = (colorName: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-900/50 text-blue-300 border-blue-800',
      green: 'bg-green-900/50 text-green-300 border-green-800',
      yellow: 'bg-yellow-900/50 text-yellow-300 border-yellow-800',
      red: 'bg-red-900/50 text-red-300 border-red-800',
      purple: 'bg-purple-900/50 text-purple-300 border-purple-800',
      orange: 'bg-orange-900/50 text-orange-300 border-orange-800',
      pink: 'bg-pink-900/50 text-pink-300 border-pink-800',
      gray: 'bg-slate-900/50 text-slate-300 border-slate-800',
    };
    return colorMap[colorName] || 'bg-slate-900/50 text-slate-300 border-slate-800';
  };

  const currentStatusConfig = settings?.statuses.find(s => s.id === activeLead.status) || settings?.statuses[0];
  const statusColorClass = currentStatusConfig ? getStatusColorClasses(currentStatusConfig.color) : 'bg-slate-800 text-slate-400';

  const sortedNotes = [...activeLead.notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex-shrink-0">
        <div className="flex justify-between items-start">
          <h2 className="text-lg font-bold text-white leading-tight flex-1 mr-2">{activeLead.companyName}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 flex-shrink-0"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${statusColorClass}`}>
            {currentStatusConfig?.label || activeLead.status}
          </span>
          <span className="text-xs text-slate-500">Added {new Date(activeLead.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Contact Info */}
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-3 pb-1 border-b border-slate-800">Contact</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <MapPin size={14} className="text-slate-500 flex-shrink-0" />
              <span className="truncate">{activeLead.location || 'No location'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Phone size={14} className="text-slate-500 flex-shrink-0" />
              {activeLead.phone ? (
                <a href={`tel:${activeLead.phone}`} className="hover:text-brand-400 hover:underline truncate">{activeLead.phone}</a>
              ) : (
                <span className="text-slate-500">No phone</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Mail size={14} className="text-slate-500 flex-shrink-0" />
              {activeLead.email ? (
                <a href={`mailto:${activeLead.email}`} className="hover:text-brand-400 hover:underline truncate">{activeLead.email}</a>
              ) : (
                <span className="text-slate-500">No email</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Globe size={14} className="text-slate-500 flex-shrink-0" />
              {activeLead.website ? (
                <a href={activeLead.website} target="_blank" rel="noreferrer" className="hover:text-brand-400 hover:underline truncate">{activeLead.website}</a>
              ) : (
                <span className="text-slate-500">No website</span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {activeLead.description && (
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-3 pb-1 border-b border-slate-800">Description</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{activeLead.description}</p>
          </div>
        )}

        {/* Status Changer */}
        {settings && (
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-3 pb-1 border-b border-slate-800">Status</h3>
            <div className="flex flex-wrap gap-2">
              {settings.statuses.map(status => (
                <button
                  key={status.id}
                  onClick={() => handleStatusChange(status.id)}
                  className={`text-xs py-1.5 px-2.5 rounded-md border font-medium transition-colors
                    ${activeLead.status === status.id
                      ? getStatusColorClasses(status.color)
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'}
                  `}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-3 pb-1 border-b border-slate-800 flex items-center gap-1.5">
            <Tag size={12} /> Products
          </h3>
          <div className="flex flex-wrap gap-2">
            {products.map(p => {
              const isSelected = (activeLead.productIds || []).includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => handleToggleProduct(p.id)}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${isSelected ? 'bg-brand-900/40 border-brand-500 text-brand-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                >
                  {p.name}
                </button>
              );
            })}
            {products.length === 0 && <span className="text-xs text-slate-500">No products configured.</span>}
          </div>
        </div>

        {/* AI Analysis */}
        {activeLead.aiAnalysis && (
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-3 pb-1 border-b border-slate-800">AI Analysis</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-2"
                  style={{ borderColor: activeLead.aiAnalysis.score > 70 ? '#22c55e' : activeLead.aiAnalysis.score > 40 ? '#eab308' : '#ef4444' }}
                >
                  <span className="text-sm font-bold text-white">{activeLead.aiAnalysis.score}</span>
                </div>
                <span className="text-xs text-slate-400 uppercase tracking-wider">Match Score</span>
              </div>
              <div>
                <h4 className="text-xs font-medium text-slate-500 mb-1">Reasoning</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{activeLead.aiAnalysis.reasoning}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-slate-500 mb-1">Next Action</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{activeLead.aiAnalysis.nextAction}</p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="p-4">
          <h3 className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-3 pb-1 border-b border-slate-800">Notes</h3>
          <div className="space-y-3 mb-4">
            {sortedNotes.length === 0 && (
              <p className="text-xs text-slate-600">No notes yet.</p>
            )}
            {sortedNotes.map(note => (
              <div key={note.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-300">{note.content}</p>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-slate-500">{new Date(note.createdAt).toLocaleString()}</span>
                  <span className="text-xs text-slate-500 font-medium">{note.author}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="relative">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className="w-full p-3 pr-12 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none text-sm placeholder-slate-600"
              rows={2}
            />
            <button
              onClick={handleAddNote}
              disabled={isSaving || !newNote.trim()}
              className="absolute bottom-3 right-3 p-1.5 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 transition-colors"
              aria-label="Add note"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
