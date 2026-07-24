import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { auth as netlifyAuth, parseIdentityUrl } from '../services/netlifyClient';

const isSupabase = import.meta.env.VITE_STORAGE_PROVIDER === 'supabase';

interface AuthUser {
    id: string;
    email?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    session: any | null;
    loading: boolean;
    isRecovery: boolean;
    clearRecovery: () => void;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    isRecovery: false,
    clearRecovery: () => { },
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [session, setSession] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRecovery, setIsRecovery] = useState(false);

    useEffect(() => {
        if (isSupabase) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                setSession(session);
                setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
                setLoading(false);
            });

            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'PASSWORD_RECOVERY') {
                    setIsRecovery(true);
                }
                setSession(session);
                setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
                setLoading(false);
            });

            return () => subscription.unsubscribe();
        } else {
            parseIdentityUrl().then(({ action, error }) => {
                if (action === 'recovery' || action === 'invite') {
                    setIsRecovery(true);
                }
                if (error) {
                    console.error('Identity verification error:', error);
                }

                const currentUser = netlifyAuth.currentUser();
                if (currentUser) {
                    if (action === 'email_change') {
                        // Refresh the user object so the new email is reflected everywhere
                        currentUser.jwt(true).then(() => {
                            setUser({ id: currentUser.id, email: currentUser.email });
                            setSession({ token: currentUser.token?.access_token });
                            setLoading(false);
                        }).catch(() => setLoading(false));
                        return;
                    }
                    setUser({ id: currentUser.id, email: currentUser.email });
                    setSession({ token: currentUser.token?.access_token });
                }
                setLoading(false);
            });
        }
    }, []);

    const clearRecovery = () => setIsRecovery(false);

    const signOut = async () => {
        setIsRecovery(false);
        if (isSupabase) {
            await supabase.auth.signOut();
        } else {
            const currentUser = netlifyAuth.currentUser();
            if (currentUser) {
                await currentUser.logout();
            }
        }
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, isRecovery, clearRecovery, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
