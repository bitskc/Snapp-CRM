import * as React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { auth as netlifyAuth } from '../services/netlifyClient';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Mail, Lock, UserPlus, LogIn, AlertCircle, CheckCircle2, Save, Github } from 'lucide-react';

const isSupabase = import.meta.env.VITE_STORAGE_PROVIDER === 'supabase';

export const Login: React.FC = () => {
    const { isRecovery, clearRecovery } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'magic' | 'reset' | 'recovery'>('signin');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    // Enter recovery mode when AuthContext detects PASSWORD_RECOVERY event
    useEffect(() => {
        if (isRecovery) {
            setAuthMode('recovery');
        }
    }, [isRecovery]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isSupabase) {
                if (authMode === 'signup') {
                    const { error } = await supabase.auth.signUp({ email, password });
                    if (error) throw error;
                    setMessage('Check your email for the confirmation link!');
                } else if (authMode === 'signin') {
                    const { error } = await supabase.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                    window.location.reload();
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
                    clearRecovery();
                    setAuthMode('signin');
                    setPassword('');
                }
            } else {
                if (authMode === 'signup') {
                    await netlifyAuth.signup(email, password);
                    setMessage('Confirmation email sent! Please verify your email to log in.');
                } else if (authMode === 'signin') {
                    await netlifyAuth.login(email, password, true);
                    window.location.reload();
                } else if (authMode === 'magic' || authMode === 'reset') {
                    await netlifyAuth.requestPasswordRecovery(email);
                    setMessage('Password recovery email sent! Check your inbox.');
                } else if (authMode === 'recovery') {
                    const user = netlifyAuth.currentUser();
                    if (!user) throw new Error('No user session found for password recovery');
                    await user.update({ password });
                    setMessage('Password updated successfully! You can now sign in.');
                    clearRecovery();
                    setAuthMode('signin');
                    setPassword('');
                }
            }
        } catch (err: any) {
            if (err.message?.includes('Email not confirmed')) {
                setError('Please confirm your email address before logging in. Check your inbox for the verification link.');
            } else {
                setError(err.message || 'An error occurred during authentication');
            }
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
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>
                        )}

                        {authMode !== 'magic' && authMode !== 'reset' && (
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
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    {message && (
                        <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                            <CheckCircle2 size={16} />
                            <span>{message}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <>
                                {authMode === 'signin' && <LogIn size={18} />}
                                {authMode === 'signup' && <UserPlus size={18} />}
                                {(authMode === 'magic' || authMode === 'reset') && <Mail size={18} />}
                                {authMode === 'recovery' && <Save size={18} />}
                                <span className="capitalize">{authMode === 'magic' ? 'Send Link' : authMode === 'reset' ? 'Reset Password' : authMode === 'recovery' ? 'Save Password' : authMode}</span>
                            </>
                        )}
                    </button>

                    <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                        {authMode === 'signin' ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => { setAuthMode('signup'); setError(null); setMessage(null); }}
                                    className="hover:text-slate-200 transition-colors"
                                >
                                    Need an account? Sign up
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setAuthMode('reset'); setError(null); setMessage(null); }}
                                    className="hover:text-slate-200 transition-colors"
                                >
                                    Forgot password?
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => { setAuthMode('signin'); setError(null); setMessage(null); }}
                                className="hover:text-slate-200 transition-colors w-full text-center"
                            >
                                Back to sign in
                            </button>
                        )}
                    </div>
                </form>
                <div className="text-center">
                    <a href="https://github.com/bitskc/Snapp-CRM" target="_blank" rel="noopener noreferrer" aria-label="View source on GitHub" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
                        <Github className="w-4 h-4" aria-hidden="true" />
                        <span>View source</span>
                    </a>
                </div>
            </div>
        </div>
    );
};
