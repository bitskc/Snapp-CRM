import * as React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useCRM } from '../contexts/CRMContext';

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useCRM();

    if (toasts.length === 0) return null;

    return (
        <div
            className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none"
            role="region"
            aria-live="polite"
            aria-label="Notifications"
        >
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
            pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border min-w-[300px] animate-in slide-in-from-right-full fade-in duration-300
            ${toast.type === 'success' ? 'bg-slate-900 border-green-500/50 text-green-400' :
                            toast.type === 'error' ? 'bg-slate-900 border-red-500/50 text-red-400' :
                                'bg-slate-900 border-indigo-500/50 text-indigo-400'}
          `}
                >
                    {toast.type === 'success' && <CheckCircle size={18} />}
                    {toast.type === 'error' && <AlertCircle size={18} />}
                    {toast.type === 'info' && <Info size={18} />}

                    <p className="text-sm font-medium flex-1">{toast.message}</p>

                    <button
                        onClick={() => removeToast(toast.id)}
                        className="text-slate-500 hover:text-white transition-colors"
                        aria-label="Close notification"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};
