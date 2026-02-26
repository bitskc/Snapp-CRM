import * as React from 'react';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Upload, X, Loader2, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Zap } from 'lucide-react';
import { parseImportData } from '../services/geminiService';
import { getRawCsvData, parseImportText, RawCsvData } from '../services/importParser';
import { saveLeadsBulk } from '../services/crmService';
import { Lead, Note } from '../types';
import { useCRM } from '../contexts/CRMContext';
import { useAuth } from '../contexts/AuthContext';

export interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ImportStep = 'UPLOAD' | 'MAP' | 'CONFIRM';

const LEAD_FIELDS = [
    { id: 'companyName', label: 'Company Name', required: true },
    { id: 'contactName', label: 'Contact Name' },
    { id: 'email', label: 'Email Address' },
    { id: 'phone', label: 'Phone Number' },
    { id: 'website', label: 'Website URL' },
    { id: 'location', label: 'Location/Address' },
    { id: 'description', label: 'General Info/Description' },
    { id: 'notes', label: 'Internal Notes' },
];

const STORAGE_KEY_MAPPING = 'import-field-mapping';

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
    const { refreshData, addToast, settings, leads } = useCRM();
    const { user } = useAuth();

    // State
    const [step, setStep] = useState<ImportStep>('UPLOAD');
    const [dataText, setDataText] = useState('');
    const [rawCsv, setRawCsv] = useState<RawCsvData | null>(null);
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({}); // Header -> LeadField
    const [parsedLeads, setParsedLeads] = useState<Partial<Lead>[]>([]);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load persisted mapping on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY_MAPPING);
        if (saved) {
            try {
                setFieldMapping(JSON.parse(saved));
            } catch (e) { }
        }
    }, []);

    const resetState = useCallback(() => {
        setStep('UPLOAD');
        setDataText('');
        setRawCsv(null);
        setParsedLeads([]);
        setError(null);
        setIsAnalyzing(false);
        setIsImporting(false);
    }, []);

    const handleClose = useCallback(() => {
        resetState();
        onClose();
    }, [onClose, resetState]);

    if (!isOpen) return null;

    const defaultStatus = settings?.statuses?.[0]?.id || 'COLD';

    const handleContinueToMapping = () => {
        if (!dataText.trim()) return;
        setError(null);

        const raw = getRawCsvData(dataText);
        if (raw && raw.headers.length > 0) {
            setRawCsv(raw);

            // Try to merge persisted mapping with new headers
            const saved = localStorage.getItem(STORAGE_KEY_MAPPING);
            let mergedMapping: Record<string, string> = {};
            if (saved) {
                try { mergedMapping = JSON.parse(saved); } catch (e) { }
            }

            raw.headers.forEach(header => {
                if (!mergedMapping[header]) {
                    const lower = header.toLowerCase().trim();
                    const match = LEAD_FIELDS.find(f =>
                        f.label.toLowerCase() === lower ||
                        f.id.toLowerCase() === lower ||
                        (f.id === 'companyName' && ['company', 'business', 'name'].includes(lower)) ||
                        (f.id === 'contactName' && ['contact', 'person'].includes(lower))
                    );
                    if (match) mergedMapping[header] = match.id;
                }
            });

            setFieldMapping(mergedMapping);
            setStep('MAP');
        } else {
            // If not a clear CSV, try AI analyze immediately (original behavior fallback)
            handleAnalyzeAI();
        }
    };

    const handleAnalyzeAI = async () => {
        setIsAnalyzing(true);
        setError(null);
        try {
            const leads = await parseImportData(dataText);
            if (leads.length === 0) {
                setError("No leads found in the unstructured text.");
            } else {
                setParsedLeads(leads);
                setStep('CONFIRM');
            }
        } catch (e: any) {
            setError(e.message || "Failed to analyze data.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleApplyMapping = () => {
        const requiredField = LEAD_FIELDS.find(f => f.required);
        if (requiredField && !Object.values(fieldMapping).includes(requiredField.id)) {
            setError(`Please map the "${requiredField.label}" field.`);
            return;
        }

        // Persist the mapping
        localStorage.setItem(STORAGE_KEY_MAPPING, JSON.stringify(fieldMapping));

        try {
            const results = parseImportText(dataText, fieldMapping as any);
            setParsedLeads(results);
            setStep('CONFIRM');
            setError(null);
        } catch (e: any) {
            setError("Error applying mapping.");
        }
    };

    const handleFastImport = async () => {
        const requiredField = LEAD_FIELDS.find(f => f.required);
        if (requiredField && !Object.values(fieldMapping).includes(requiredField.id)) {
            handleContinueToMapping(); // Go to mapping step if required field is not mapped
            return;
        }

        setIsImporting(true);
        try {
            const results = parseImportText(dataText, fieldMapping as any);
            if (results.length > 0) {
                await doBulkImport(results);
            } else {
                setError("No leads found to fast import.");
                setIsImporting(false);
            }
        } catch (e) {
            setError("Fast import failed.");
            setIsImporting(false);
        }
    };

    const doBulkImport = async (targetLeads: Partial<Lead>[]) => {
        if (!user) return;
        setIsImporting(true);
        setError(null);

        const dedupKey = (l: Partial<Lead>) => [
            (l.companyName || '').toLowerCase().trim(),
            (l.phone || '').replace(/\D/g, ''),
            (l.email || '').toLowerCase().trim(),
        ].join('|');

        const existingKeys = new Set(leads.map(dedupKey));
        const filteredLeads: Lead[] = [];
        let skippedCount = 0;

        for (const leadData of targetLeads) {
            const key = dedupKey(leadData);
            if (existingKeys.has(key)) {
                skippedCount++;
                continue;
            }
            existingKeys.add(key);

            const noteContent = (leadData as any)._notes;
            const noteId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
            const notes: Note[] = noteContent ? [{
                id: noteId,
                content: noteContent,
                createdAt: new Date().toISOString(),
                author: 'Import',
            }] : [];

            const leadId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
            filteredLeads.push({
                id: leadId,
                user_id: user.id,
                companyName: leadData.companyName || 'Unknown Company',
                description: leadData.description || '',
                location: leadData.location || '',
                website: leadData.website,
                status: defaultStatus,
                source: 'MANUAL',
                notes,
                productIds: [],
                createdAt: new Date().toISOString(),
                contactName: leadData.contactName,
                email: leadData.email,
                phone: leadData.phone
            });
        }

        if (filteredLeads.length === 0) {
            addToast(`No new leads to import (${skippedCount} duplicates skipped)`, "info");
            handleClose();
            return;
        }

        try {
            await saveLeadsBulk(filteredLeads);
            await refreshData();
            const skippedMsg = skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : '';
            addToast(`Successfully imported ${filteredLeads.length} leads${skippedMsg}`, "success");
            handleClose();
        } catch (e) {
            setError("Bulk import failed.");
            console.error(e);
        } finally {
            setIsImporting(false);
        }
    };

    const handleImport = () => doBulkImport(parsedLeads);

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 w-full max-w-3xl rounded-xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                            <Upload className="text-brand-400" /> Import Leads
                        </h2>
                        <div className="flex items-center gap-2 mt-2 text-[10px] uppercase tracking-widest font-bold">
                            <span className={step === 'UPLOAD' ? 'text-brand-400' : 'text-slate-500'}>1. Upload</span>
                            <ArrowRight size={10} className="text-slate-600" />
                            <span className={step === 'MAP' ? 'text-brand-400' : 'text-slate-500'}>2. Map Fields</span>
                            <ArrowRight size={10} className="text-slate-600" />
                            <span className={step === 'CONFIRM' ? 'text-brand-400' : 'text-slate-500'}>3. Confirm</span>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-slate-500 hover:text-slate-300">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {step === 'UPLOAD' && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-400">
                                Paste your lead data below (CSV, TSV, or spreadsheet rows).
                            </p>
                            <textarea
                                className="w-full h-80 bg-slate-950 border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-300 focus:outline-none focus:border-brand-500 transition-colors resize-none"
                                placeholder="Company, Website, Contact...&#10;Acme Corp, acme.com, John Doe..."
                                value={dataText}
                                onChange={(e) => setDataText(e.target.value)}
                            />
                        </div>
                    )}

                    {step === 'MAP' && rawCsv && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-slate-200">Map CSV Columns</h3>
                                <p className="text-xs text-slate-500">Headers are remembered for next time</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {rawCsv.headers.map((header, idx) => (
                                    <div key={idx} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Column: {header}</span>
                                            <span className="text-[10px] text-slate-600 bg-slate-900 px-1.5 py-0.5 rounded">
                                                Preview: {rawCsv.rows[0]?.[idx] || '—'}
                                            </span>
                                        </div>
                                        <select
                                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-brand-500 outline-none"
                                            value={fieldMapping[header] || ''}
                                            onChange={(e) => setFieldMapping(prev => ({ ...prev, [header]: e.target.value }))}
                                        >
                                            <option value="">(Skip this column)</option>
                                            {LEAD_FIELDS.map(f => (
                                                <option key={f.id} value={f.id}>
                                                    {f.label} {f.required ? '*' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'CONFIRM' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-slate-200">Ready to Import {parsedLeads.length} Leads</h3>
                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                    <Zap size={12} className="text-yellow-400" />
                                    Optimized Bulk Mode Active
                                </div>
                            </div>
                            <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden max-h-80 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left text-xs text-slate-400">
                                    <thead className="bg-slate-800/50 text-slate-200 sticky top-0">
                                        <tr>
                                            <th className="p-3 font-medium">Company</th>
                                            <th className="p-3 font-medium">Contact/Email</th>
                                            <th className="p-3 font-medium">Location</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {parsedLeads.map((l, i) => (
                                            <tr key={i} className="hover:bg-slate-900/50 transition-colors">
                                                <td className="p-3 font-medium text-slate-200">{l.companyName}</td>
                                                <td className="p-3">{l.contactName || l.email || '—'}</td>
                                                <td className="p-3 truncate max-w-[150px]">{l.location || '—'}</td>
                                            </tr>
                                        ))}
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

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-800 flex justify-between items-center bg-slate-900 rounded-b-xl">
                    <div className="text-xs text-slate-500">
                        {step === 'MAP' && <span>* Required: Company Name</span>}
                    </div>
                    <div className="flex gap-3">
                        {step !== 'UPLOAD' && (
                            <button
                                onClick={() => { setStep(step === 'CONFIRM' && rawCsv ? 'MAP' : 'UPLOAD'); setError(null); }}
                                className="px-4 py-2 text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium"
                                disabled={isImporting}
                            >
                                <ArrowLeft size={16} /> Back
                            </button>
                        )}

                        {step === 'UPLOAD' && (
                            <>
                                <button
                                    onClick={handleFastImport}
                                    disabled={!dataText.trim() || isImporting}
                                    className="px-4 py-2 text-slate-400 hover:text-brand-400 flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all"
                                >
                                    <Zap size={14} className="text-yellow-400" /> Fast Import
                                </button>
                                <button
                                    onClick={handleContinueToMapping}
                                    disabled={!dataText.trim() || isAnalyzing}
                                    className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <span>Review & Map</span>}
                                    <ArrowRight size={18} />
                                </button>
                            </>
                        )}

                        {step === 'MAP' && (
                            <button
                                onClick={handleApplyMapping}
                                className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-bold transition-all flex items-center gap-2"
                            >
                                Preview & Finish
                                <ArrowRight size={18} />
                            </button>
                        )}

                        {step === 'CONFIRM' && (
                            <button
                                onClick={handleImport}
                                disabled={isImporting || parsedLeads.length === 0}
                                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isImporting ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                                Import {parsedLeads.length} Leads
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
