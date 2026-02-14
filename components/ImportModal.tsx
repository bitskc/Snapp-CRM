import React, { useState } from 'react';
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseImportData } from '../services/geminiService';
import { saveLead } from '../services/crmService';
import { Lead } from '../types';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImportComplete }) => {
    const [dataText, setDataText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [parsedLeads, setParsedLeads] = useState<Partial<Lead>[]>([]);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleAnalyze = async () => {
        if (!dataText.trim()) return;

        setIsAnalyzing(true);
        setError(null);
        try {
            const leads = await parseImportData(dataText);
            if (leads.length === 0) {
                setError("No valid leads could be parsed. Please check the format.");
            } else {
                setParsedLeads(leads);
            }
        } catch (e) {
            setError("Failed to analyze data via AI. Please try again.");
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleImport = async () => {
        setIsImporting(true);
        try {
            let importedCount = 0;
            for (const leadData of parsedLeads) {
                // Create full lead object
                const newLead: Lead = {
                    id: Math.random().toString(36).substr(2, 9),
                    companyName: leadData.companyName || 'Unknown Company',
                    description: leadData.description || '',
                    location: leadData.location || '',
                    website: leadData.website,
                    status: 'COLD',
                    source: 'MANUAL',
                    notes: leadData.notes || [],
                    productIds: [],
                    createdAt: new Date().toISOString(),
                    contactName: leadData.contactName,
                    email: leadData.email,
                    phone: leadData.phone
                };
                await saveLead(newLead);
                importedCount++;
            }
            onImportComplete();
            onClose();
        } catch (e) {
            setError("Error saving leads to database.");
            console.error(e);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">

                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                        <Upload className="text-brand-400" /> Import Leads
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {!parsedLeads.length ? (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-400">
                                Paste your lead data below (CSV, messy text, spreadsheet rows).
                                The AI will automatically figure out which columns are which.
                            </p>
                            <textarea
                                className="w-full h-64 bg-slate-950 border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-300 focus:outline-none focus:border-brand-500 transition-colors resize-none"
                                placeholder="Company Name, Website, Contact Name...&#10;Acme Corp, acme.com, John Doe&#10;..."
                                value={dataText}
                                onChange={(e) => setDataText(e.target.value)}
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-slate-200">Parsed {parsedLeads.length} Leads</h3>
                                <button
                                    onClick={() => setParsedLeads([])}
                                    className="text-xs text-slate-500 hover:text-brand-400 underline"
                                >
                                    Start Over
                                </button>
                            </div>
                            <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                                <table className="w-full text-left text-sm text-slate-400">
                                    <thead className="bg-slate-800/50 text-slate-200">
                                        <tr>
                                            <th className="p-3 font-medium">Company</th>
                                            <th className="p-3 font-medium">Desc/Loc</th>
                                            <th className="p-3 font-medium">Contact</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {parsedLeads.slice(0, 5).map((l, i) => (
                                            <tr key={i}>
                                                <td className="p-3 font-medium text-slate-200">{l.companyName}</td>
                                                <td className="p-3 truncate max-w-[150px]">{l.location || l.description}</td>
                                                <td className="p-3">{l.contactName || l.email}</td>
                                            </tr>
                                        ))}
                                        {parsedLeads.length > 5 && (
                                            <tr>
                                                <td colSpan={3} className="p-3 text-center text-xs text-slate-600 italic">
                                                    ...and {parsedLeads.length - 5} more
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 text-red-400 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900 rounded-b-xl">
                    {parsedLeads.length === 0 ? (
                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !dataText.trim()}
                            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                            Analyze & Parse
                        </button>
                    ) : (
                        <button
                            onClick={handleImport}
                            disabled={isImporting}
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isImporting ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                            Import {parsedLeads.length} Leads
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
