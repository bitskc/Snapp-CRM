import React, { useState, useEffect, useRef } from 'react';
import { X, Phone, Mail, MapPin, Globe, Loader2, Sparkles, Send, Edit2, Save, ChevronLeft, ChevronRight, Copy, Tag, Stethoscope, Gauge, ArrowRight, Share2, Linkedin, Facebook, Twitter, Youtube, Video } from 'lucide-react';
import { Lead, LeadStatus, Note, AppSettings, Product } from '../types';
import { addNoteToLead, saveLead } from '../services/crmService';
import { generateCallScript, generateEmail, analyzeLead, executePrescription, generateSocialPost } from '../services/geminiService';

interface LeadModalProps {
  lead: Lead;
  settings: AppSettings;
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedLead: Lead) => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export const LeadModal: React.FC<LeadModalProps> = ({
  lead, settings, products, isOpen, onClose, onUpdate, onNext, onPrev, hasNext, hasPrev
}) => {
  const [activeLead, setActiveLead] = useState<Lead>(lead);
  const [newNote, setNewNote] = useState('');
  const [generatedContent, setGeneratedContent] = useState<{ type: 'script' | 'email' | 'social', content: string, subject?: string, rationale?: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'notes' | 'ai' | 'marketing'>('notes');
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Deal Doctor State
  const [prescriptionInstructions, setPrescriptionInstructions] = useState('');
  const [isExecutingPrescription, setIsExecutingPrescription] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // Sync state when prop changes
  useEffect(() => {
    setActiveLead(lead);
    setGeneratedContent(null);
    setIsEditing(false);
    setActiveRightTab('notes');
    setPrescriptionInstructions('');
  }, [lead]);

  // Wrapper for closing to ensure save happens
  const handleClose = async () => {
    // Autosave current state before closing
    if (activeLead !== lead) {
      await saveLead(activeLead);
      onUpdate(activeLead);
    }
    onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight' && hasNext && onNext) {
        handleClose().then(() => onNext && onNext());
      }
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        handleClose().then(() => onPrev && onPrev());
      }
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasNext, hasPrev, onNext, onPrev, onClose, activeLead]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleStatusChange = async (newStatus: LeadStatus) => {
    const updated = { ...activeLead, status: newStatus };
    setActiveLead(updated);
    // Optimistic update handled by parent, but we save locally too just in case
    await saveLead(updated);
    onUpdate(updated);
  };

  const handleToggleProduct = async (productId: string) => {
    const currentIds = activeLead.productIds || [];
    const newIds = currentIds.includes(productId)
      ? currentIds.filter(id => id !== productId)
      : [...currentIds, productId];

    const updated = { ...activeLead, productIds: newIds };
    setActiveLead(updated);
    await saveLead(updated);
    onUpdate(updated);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSaving(true);
    try {
      const note = await addNoteToLead(activeLead.id, newNote);
      const updated = { ...activeLead, notes: [...activeLead.notes, note] };
      setActiveLead(updated);
      onUpdate(updated);
      setNewNote('');
    } finally {
      setIsSaving(false);
    }
  };

  const getRelevantProducts = () => {
    return products.filter(p => (activeLead.productIds || []).includes(p.id));
  };

  const handleGenerateScript = async () => {
    setIsGenerating(true);
    setActiveRightTab('notes');
    try {
      const result = await generateCallScript(activeLead, settings, getRelevantProducts());
      setGeneratedContent({ type: 'script', content: result });
    } catch (err) {
      setGeneratedContent({ type: 'script', content: "Failed to generate script." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateEmail = async () => {
    setIsGenerating(true);
    setActiveRightTab('notes');
    try {
      const type = activeLead.notes.length > 0 ? 'FOLLOW_UP' : 'COLD';
      const result = await generateEmail(activeLead, type, settings, getRelevantProducts());
      setGeneratedContent({ type: 'email', content: result.body, subject: result.subject });
    } catch (err) {
      setGeneratedContent({ type: 'email', content: "Failed to generate email." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSocialPost = async (platform: 'LINKEDIN' | 'TWITTER' | 'FACEBOOK' | 'YOUTUBE' | 'TIKTOK') => {
    setIsGenerating(true);
    setActiveRightTab('marketing');
    try {
      const result = await generateSocialPost(activeLead, platform, settings);
      setGeneratedContent({ type: 'social', content: result.content, rationale: result.rationale });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyzeLead = async () => {
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeLead(activeLead, settings);
      const updated = { ...activeLead, aiAnalysis: analysis };
      setActiveLead(updated);
      await saveLead(updated);
      onUpdate(updated);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecutePrescription = async () => {
    if (!activeLead.aiAnalysis) return;
    setIsExecutingPrescription(true);
    try {
      const result = await executePrescription(
        activeLead,
        settings,
        getRelevantProducts(),
        activeLead.aiAnalysis.nextAction,
        prescriptionInstructions
      );
      setGeneratedContent(result);
    } finally {
      setIsExecutingPrescription(false);
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await saveLead(activeLead);
      onUpdate(activeLead);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof Lead, value: string) => {
    setActiveLead(prev => ({ ...prev, [field]: value }));
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX);
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - e.changedTouches[0].clientX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && hasNext && onNext) {
      handleClose().then(() => onNext && onNext());
    }
    if (isRightSwipe && hasPrev && onPrev) {
      handleClose().then(() => onPrev && onPrev());
    }
  };

  const openMailClient = () => {
    if (!generatedContent || generatedContent.type !== 'email') return;
    const subject = encodeURIComponent(generatedContent.subject || '');
    const body = encodeURIComponent(generatedContent.content);
    window.open(`mailto:${activeLead.email || ''}?subject=${subject}&body=${body}`);
  };

  const currentStatusConfig = settings.statuses.find(s => s.id === activeLead.status) || settings.statuses[0];
  const statusColorClass = currentStatusConfig ? `bg-${currentStatusConfig.color}-900/50 text-${currentStatusConfig.color}-300 border-${currentStatusConfig.color}-800` : 'bg-slate-800 text-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* Navigation Arrows */}
      {hasPrev && (
        <button onClick={(e) => { e.stopPropagation(); handleClose().then(() => onPrev && onPrev()); }} className="hidden md:block absolute left-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all z-50">
          <ChevronLeft size={48} />
        </button>
      )}
      {hasNext && (
        <button onClick={(e) => { e.stopPropagation(); handleClose().then(() => onNext && onNext()); }} className="hidden md:block absolute right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all z-50">
          <ChevronRight size={48} />
        </button>
      )}

      <div ref={modalRef} onClick={(e) => e.stopPropagation()} className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl h-full md:h-auto md:max-h-[90vh] overflow-y-auto md:overflow-hidden flex flex-col md:flex-row border border-slate-700 relative z-10">

        {/* Left Panel: Info & Actions */}
        <div className="w-full md:w-1/2 p-6 border-r border-slate-800 overflow-y-visible md:overflow-y-auto custom-scrollbar bg-slate-900 flex-shrink-0">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              {!isEditing ? (
                <h2 className="text-2xl font-bold text-white">{activeLead.companyName}</h2>
              ) : (
                <input
                  type="text"
                  value={activeLead.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white rounded px-2 py-1 w-full mb-2 font-bold text-xl"
                />
              )}

              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${statusColorClass}`}>
                  {currentStatusConfig?.label || activeLead.status}
                </span>
                <span className="text-xs text-slate-500">Added {new Date(activeLead.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => isEditing ? handleSaveChanges() : setIsEditing(true)}
                className="text-slate-400 hover:text-brand-400 p-1"
                title={isEditing ? "Save" : "Edit"}
              >
                {isEditing ? <Save size={20} className="text-brand-400" /> : <Edit2 size={20} />}
              </button>
              <button onClick={handleClose} className="text-slate-400 hover:text-white p-1">
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {/* Location */}
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <MapPin size={16} className="text-slate-500 flex-shrink-0" />
              {isEditing ? (
                <input
                  className="bg-slate-800 border-slate-700 rounded px-2 py-1 w-full text-sm"
                  value={activeLead.location || ''}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Location"
                />
              ) : <span>{activeLead.location || 'No location'}</span>}
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Phone size={16} className="text-slate-500 flex-shrink-0" />
              {isEditing ? (
                <input
                  className="bg-slate-800 border-slate-700 rounded px-2 py-1 w-full text-sm"
                  value={activeLead.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Phone"
                />
              ) : <span>{activeLead.phone || 'No phone'}</span>}
            </div>

            {/* Email */}
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Mail size={16} className="text-slate-500 flex-shrink-0" />
              {isEditing ? (
                <input
                  className="bg-slate-800 border-slate-700 rounded px-2 py-1 w-full text-sm"
                  value={activeLead.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Email"
                />
              ) : (
                <a href={`mailto:${activeLead.email}`} className="hover:text-brand-400 hover:underline">
                  {activeLead.email || 'No email'}
                </a>
              )}
            </div>

            {/* Website */}
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Globe size={16} className="text-slate-500 flex-shrink-0" />
              {isEditing ? (
                <input
                  className="bg-slate-800 border-slate-700 rounded px-2 py-1 w-full text-sm"
                  value={activeLead.website || ''}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="Website"
                />
              ) : (
                <a href={activeLead.website} target="_blank" rel="noreferrer" className="hover:text-brand-400 hover:underline">
                  {activeLead.website || 'No website'}
                </a>
              )}
            </div>

            {/* Contact Name */}
            {isEditing && (
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="w-4"></span>
                <input
                  className="bg-slate-800 border-slate-700 rounded px-2 py-1 w-full text-sm"
                  value={activeLead.contactName || ''}
                  onChange={(e) => handleInputChange('contactName', e.target.value)}
                  placeholder="Contact Name"
                />
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2"><Tag size={14} /> Interested In</h3>
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
                )
              })}
              {products.length === 0 && <span className="text-xs text-slate-500">No products configured in settings.</span>}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-slate-400 mb-2">Description</h3>
            {isEditing ? (
              <textarea
                className="bg-slate-800 border-slate-700 text-slate-200 rounded px-2 py-2 w-full text-sm h-32"
                value={activeLead.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            ) : (
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                {activeLead.description || 'No description provided.'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <h3 className="text-sm font-semibold text-slate-400 col-span-2">Move Status</h3>
            {settings.statuses.map(status => (
              <button
                key={status.id}
                onClick={() => handleStatusChange(status.id)}
                className={`text-xs py-2 px-3 rounded-md border font-medium transition-colors
                  ${activeLead.status === status.id
                    ? `border-${status.color}-500 bg-${status.color}-900/20 text-${status.color}-400`
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'}
                `}
              >
                Mark {status.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGenerateScript}
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 text-slate-200 py-3 rounded-lg font-medium hover:bg-slate-700 transition-all disabled:opacity-50 text-sm"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Phone size={16} />}
              Call Script
            </button>
            <button
              onClick={handleGenerateEmail}
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 bg-brand-600 text-white py-3 rounded-lg font-medium shadow-lg shadow-brand-900/20 hover:bg-brand-500 transition-all disabled:opacity-50 text-sm"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />}
              Draft Email
            </button>
          </div>

        </div>

        {/* Right Panel: Notes & Generated Content */}
        <div className="w-full md:w-1/2 flex flex-col h-[500px] md:h-auto bg-slate-800">

          <div className="flex border-b border-slate-700 bg-slate-900">
            <button
              onClick={() => setActiveRightTab('notes')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeRightTab === 'notes' ? 'border-brand-400 text-brand-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              Activity
            </button>
            <button
              onClick={() => setActiveRightTab('ai')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeRightTab === 'ai' ? 'border-purple-400 text-purple-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              <Stethoscope size={16} /> Deal Doctor
            </button>
            <button
              onClick={() => setActiveRightTab('marketing')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeRightTab === 'marketing' ? 'border-pink-400 text-pink-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              <Share2 size={16} /> Marketing
            </button>
          </div>

          {generatedContent && (
            <div className="absolute inset-0 z-20 bg-slate-800 flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900">
                <h3 className="font-semibold text-indigo-300 flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-400" />
                  {generatedContent.type === 'script' ? 'AI Generated Script' : generatedContent.type === 'email' ? 'AI Generated Email' : 'AI Social Post'}
                </h3>
                <button onClick={() => setGeneratedContent(null)} className="text-xs text-indigo-400 hover:text-white">Close Overlay</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg shadow-inner">
                  {generatedContent.subject && (
                    <div className="mb-4 pb-4 border-b border-slate-800">
                      <span className="text-xs text-slate-500 block uppercase tracking-wider mb-1">Subject</span>
                      <p className="text-slate-200 font-medium">{generatedContent.subject}</p>
                    </div>
                  )}
                  <div className="prose prose-sm prose-invert max-w-none text-slate-300 whitespace-pre-wrap font-mono text-sm">
                    {generatedContent.content}
                  </div>
                  {generatedContent.type === 'social' && generatedContent.rationale && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <span className="text-xs text-slate-500 block uppercase tracking-wider mb-1">AI Rationale</span>
                      <p className="text-slate-400 text-xs italic">{generatedContent.rationale}</p>
                    </div>
                  )}
                </div>
                {generatedContent.type === 'email' && (
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={openMailClient}
                      className="flex-1 flex items-center justify-center gap-2 bg-brand-600 text-white py-2 rounded-lg text-sm hover:bg-brand-500"
                    >
                      <Mail size={16} /> Open in Mail App
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(generatedContent.content)}
                      className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                )}
                {(generatedContent.type === 'script' || generatedContent.type === 'social') && (
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => navigator.clipboard.writeText(generatedContent.content)}
                      className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 flex items-center justify-center gap-2"
                    >
                      <Copy size={16} /> Copy to Clipboard
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeRightTab === 'notes' && !generatedContent && (
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-4 pr-2">
                {activeLead.notes.length === 0 && (
                  <div className="text-center text-slate-600 text-sm mt-10">No notes yet. Start tracking interactions!</div>
                )}
                {activeLead.notes.map(note => (
                  <div key={note.id} className="bg-slate-900 p-3 rounded-lg border border-slate-700">
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
                  placeholder="Add a call note..."
                  className="w-full p-3 pr-12 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none text-sm placeholder-slate-600"
                  rows={3}
                />
                <button
                  onClick={handleAddNote}
                  disabled={isSaving || !newNote.trim()}
                  className="absolute bottom-3 right-3 p-1.5 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          )}

          {activeRightTab === 'ai' && !generatedContent && (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
              {!activeLead.aiAnalysis ? (
                <div className="text-center mt-10">
                  <div className="bg-purple-900/20 p-4 rounded-full inline-block mb-4">
                    <Stethoscope size={48} className="text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Deal Doctor</h3>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto mb-6">
                    Let AI analyze your compatibility with this lead, score the opportunity, and suggest your next best move.
                  </p>
                  <button
                    onClick={handleAnalyzeLead}
                    disabled={isAnalyzing}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-purple-900/30 flex items-center gap-2 mx-auto disabled:opacity-50"
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                    Diagnose Deal
                  </button>
                </div>
              ) : (
                <div className="w-full space-y-6 animate-in fade-in duration-500">
                  <div className="flex flex-col items-center">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="10" />
                        <circle cx="50" cy="50" r="45" fill="none" stroke={activeLead.aiAnalysis.score > 70 ? '#22c55e' : activeLead.aiAnalysis.score > 40 ? '#eab308' : '#ef4444'} strokeWidth="10" strokeDasharray={`${activeLead.aiAnalysis.score * 2.83} 283`} transform="rotate(-90 50 50)" className="transition-all duration-1000 ease-out" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-white">{activeLead.aiAnalysis.score}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Score</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Diagnosis</h4>
                    <p className="text-slate-200 text-sm leading-relaxed">{activeLead.aiAnalysis.reasoning}</p>
                  </div>

                  <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Sparkles size={14} /> Prescription
                    </h4>
                    <p className="text-purple-100 text-sm font-medium mb-3">{activeLead.aiAnalysis.nextAction}</p>

                    <div className="space-y-2 pt-2 border-t border-purple-500/20">
                      <textarea
                        className="w-full bg-slate-800/50 border border-purple-500/30 rounded p-2 text-xs text-slate-200 outline-none focus:border-purple-400"
                        placeholder="Add specific instructions (e.g., 'Mention the discount', 'Ask for Jane')"
                        rows={2}
                        value={prescriptionInstructions}
                        onChange={(e) => setPrescriptionInstructions(e.target.value)}
                      />
                      <button
                        onClick={handleExecutePrescription}
                        disabled={isExecutingPrescription}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded text-xs font-bold shadow flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                        {isExecutingPrescription ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                        Execute Action (Generate Content)
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-center pt-4">
                    <button
                      onClick={handleAnalyzeLead}
                      disabled={isAnalyzing}
                      className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                    >
                      <RefreshCw size={12} className={isAnalyzing ? "animate-spin" : ""} /> Re-analyze
                    </button>
                    <span className="mx-2 text-slate-700">|</span>
                    <span className="text-xs text-slate-600">Updated: {new Date(activeLead.aiAnalysis.lastUpdated).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeRightTab === 'marketing' && !generatedContent && (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
              <div className="text-center mt-6 mb-8">
                <h3 className="text-lg font-bold text-white mb-2">Social Marketing</h3>
                <p className="text-slate-400 text-sm max-w-xs mx-auto">
                  Generate platform-specific content to engage this lead on social media.
                </p>
              </div>

              <div className="w-full grid grid-cols-1 gap-4">
                <button
                  onClick={() => handleSocialPost('LINKEDIN')}
                  disabled={isGenerating}
                  className="bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800 p-4 rounded-xl flex items-center gap-4 transition-all group text-left"
                >
                  <div className="bg-blue-600 p-2 rounded-lg text-white group-hover:scale-110 transition-transform">
                    <Linkedin size={24} />
                  </div>
                  <div>
                    <h4 className="text-slate-200 font-semibold text-sm">LinkedIn Professional</h4>
                    <p className="text-slate-500 text-xs">B2B engagement & value proposition</p>
                  </div>
                </button>

                <button
                  onClick={() => handleSocialPost('TWITTER')}
                  disabled={isGenerating}
                  className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center gap-4 transition-all group text-left"
                >
                  <div className="bg-black border border-slate-600 p-2 rounded-lg text-white group-hover:scale-110 transition-transform">
                    <Twitter size={24} />
                  </div>
                  <div>
                    <h4 className="text-slate-200 font-semibold text-sm">X / Twitter</h4>
                    <p className="text-slate-500 text-xs">Short, snappy updates & tagging</p>
                  </div>
                </button>

                <button
                  onClick={() => handleSocialPost('FACEBOOK')}
                  disabled={isGenerating}
                  className="bg-blue-900/20 hover:bg-blue-900/40 border border-blue-900/50 p-4 rounded-xl flex items-center gap-4 transition-all group text-left"
                >
                  <div className="bg-blue-500 p-2 rounded-lg text-white group-hover:scale-110 transition-transform">
                    <Facebook size={24} />
                  </div>
                  <div>
                    <h4 className="text-slate-200 font-semibold text-sm">Facebook</h4>
                    <p className="text-slate-500 text-xs">Community focused & visual</p>
                  </div>
                </button>

                <button
                  onClick={() => handleSocialPost('YOUTUBE')}
                  disabled={isGenerating}
                  className="bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 p-4 rounded-xl flex items-center gap-4 transition-all group text-left"
                >
                  <div className="bg-red-600 p-2 rounded-lg text-white group-hover:scale-110 transition-transform">
                    <Youtube size={24} />
                  </div>
                  <div>
                    <h4 className="text-slate-200 font-semibold text-sm">YouTube Description</h4>
                    <p className="text-slate-500 text-xs">Video content descriptions & SEO</p>
                  </div>
                </button>

                <button
                  onClick={() => handleSocialPost('TIKTOK')}
                  disabled={isGenerating}
                  className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center gap-4 transition-all group text-left"
                >
                  <div className="bg-gradient-to-br from-cyan-400 to-pink-500 p-2 rounded-lg text-white group-hover:scale-110 transition-transform">
                    <Video size={24} />
                  </div>
                  <div>
                    <h4 className="text-slate-200 font-semibold text-sm">TikTok / Reels</h4>
                    <p className="text-slate-500 text-xs">Short-form video scripts & captions</p>
                  </div>
                </button>
              </div>

              {isGenerating && (
                <div className="mt-8 flex items-center gap-2 text-slate-400 animate-pulse">
                  <Loader2 className="animate-spin" size={18} />
                  <span className="text-sm">Generating content...</span>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// Simple RefreshCw icon for the button above, imported from lucide
import { RefreshCw } from 'lucide-react';