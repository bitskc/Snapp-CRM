import * as React from 'react';
import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Loader2, Mail, Lock, UserPlus, LogIn, AlertCircle, CheckCircle2, Save } from 'lucide-react';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'magic' | 'reset' | 'recovery'>('signin');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    React.useEffect(() => {
        // Detect recovery mode from URL
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'recovery') {
            setAuthMode('recovery');
        }

        // Handle the hash fragment from Supabase reset link
        if (window.location.hash.includes('type=recovery')) {
            setAuthMode('recovery');
        }
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (authMode === 'signup') {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setMessage('Check your email for the confirmation link!');
            } else if (authMode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else if (authMode === 'magic') {
                const { error } = await supabase.auth.signInWithOtp({
                    email,
                    options: { emailRedirectTo: window.location.origin }
                });
                if (error) throw error;
                setMessage('Magic link sent! Check your email.');
            } else if (authMode === 'reset') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}?mode=recovery`
                });
                if (error) throw error;
                setMessage('Password reset link sent! Check your email.');
            } else if (authMode === 'recovery') {
                const { error } = await supabase.auth.updateUser({ password });
                if (error) throw error;
                setMessage('Password updated successfully! You can now sign in.');
                setAuthMode('signin');
                setPassword('');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during authentication');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Snapp CRM</h1>
                    <p className="mt-2 text-slate-400 text-sm">
                        {authMode === 'signin' && 'Sign in to manage your leads'}
                        {authMode === 'signup' && 'Create an account to get started'}
                        {authMode === 'magic' && 'We\'ll email you a login link'}
                        {authMode === 'reset' && 'Reset your password'}
                        {authMode === 'recovery' && 'Enter your new password below'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-xl space-y-6">
                    <div className="space-y-4">
                        {authMode !== 'recovery' && (
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete={authMode === 'signin' ? "username" : "email"}
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all placeholder-slate-600"
                                        placeholder="name@company.com"
                                    />
                                </div>
                            </div>
                        )}

                        {(authMode === 'signin' || authMode === 'signup' || authMode === 'recovery') && (
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-400 mb-1">
                                    {authMode === 'recovery' ? 'New Password' : 'Password'}
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete={authMode === 'signin' ? "current-password" : "new-password"}
                                        required
                                        minLength={6}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all placeholder-slate-600"
                                        placeholder="••••••••"
                                    />
                                </div>
                                {authMode === 'signin' && (
                                    <div className="flex justify-end mt-1">
                                        <button
                                            type="button"
                                            onClick={() => setAuthMode('reset')}
                                            className="text-xs text-slate-500 hover:text-brand-400"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start gap-2 text-sm text-red-400">
                            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {message && (
                        <div className="p-3 bg-green-900/20 border border-green-900/50 rounded-lg flex items-start gap-2 text-sm text-green-400">
                            <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                            <span>{message}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <>
                                {authMode === 'signin' && <><LogIn size={18} /> Sign In</>}
                                {authMode === 'signup' && <><UserPlus size={18} /> Sign Up</>}
                                {authMode === 'magic' && <><Mail size={18} /> Send Magic Link</>}
                                {authMode === 'reset' && <><Lock size={18} /> Send Reset Link</>}
                                {authMode === 'recovery' && <><Save size={18} /> Update Password</>}
                            </>
                        )}
                    </button>

                    <div className="text-center pt-2 space-y-2">
                        {authMode === 'signin' ? (
                            <>
                                <button type="button" onClick={() => setAuthMode('signup')} className="block w-full text-sm text-slate-400 hover:text-brand-400">Don't have an account? Sign up</button>
                                <button type="button" onClick={() => setAuthMode('magic')} className="block w-full text-sm text-brand-400/80 hover:text-brand-400">Sign in with Magic Link</button>
                            </>
                        ) : (
                            <button type="button" onClick={() => setAuthMode('signin')} className="block w-full text-sm text-slate-400 hover:text-brand-400">Back to Sign In</button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};
