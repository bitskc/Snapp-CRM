import GoTrue from 'gotrue-js';

const identityUrl = import.meta.env.VITE_NETLIFY_IDENTITY_URL ||
    (typeof window !== 'undefined' && window.location.origin.includes('netlify.app')
        ? `${window.location.origin}/.netlify/identity`
        : '');

export const auth = new GoTrue({
    APIUrl: identityUrl || 'https://snappcrm.netlify.app/.netlify/identity',
    setCookie: true,
});

export const parseIdentityUrl = async (): Promise<{ action: 'signup' | 'recovery' | 'invite' | 'email_change' | null; error: string | null }> => {
    if (typeof window === 'undefined') return { action: null, error: null };
    const hash = window.location.hash;
    if (!hash) return { action: null, error: null };

    const params = new URLSearchParams(hash.substring(1));
    const confirmationToken = params.get('confirmation_token');
    const recoveryToken = params.get('recovery_token');
    const inviteToken = params.get('invite_token');
    const emailChangeToken = params.get('email_change_token');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error) {
        window.history.replaceState(null, '', window.location.pathname);
        return { action: null, error: errorDescription || error };
    }

    let action: 'signup' | 'recovery' | 'invite' | 'email_change' | null = null;
    let type = '';
    let token = '';

    if (confirmationToken) { action = 'signup'; type = 'signup'; token = confirmationToken; }
    if (recoveryToken) { action = 'recovery'; type = 'recovery'; token = recoveryToken; }
    if (inviteToken) { action = 'invite'; type = 'invite'; token = inviteToken; }
    if (emailChangeToken) { action = 'email_change'; type = 'email_change'; token = emailChangeToken; }

    if (!action || !token) return { action: null, error: null };

    try {
        const baseUrl = (identityUrl || 'https://snappcrm.netlify.app/.netlify/identity').replace(/\/$/, '');
        const res = await fetch(`${baseUrl}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, type })
        });

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            return { action, error: errJson.msg || `Verification failed (${res.status})` };
        }

        if (action === 'signup' || action === 'email_change') {
            window.history.replaceState(null, '', window.location.pathname);
        }
        return { action, error: null };
    } catch (err: any) {
        return { action, error: err.message || 'Failed to verify identity token' };
    }
};

export const getAuthToken = async (): Promise<string | null> => {
    const user = auth.currentUser();
    if (!user) return null;
    try {
        const token = await user.jwt();
        return token;
    } catch (err) {
        console.error('Failed to get JWT token from Netlify Identity', err);
        return null;
    }
};

export const changeNetlifyEmail = async (newEmail: string): Promise<void> => {
    const user = auth.currentUser();
    if (!user) throw new Error('Not authenticated');
    await user.update({ email: newEmail });
};

export const apiFetch = async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const token = await getAuthToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/.netlify/functions/api/${endpoint}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        const errText = await res.text();
        let errMsg = `API error (${res.status})`;
        try {
            const errJson = JSON.parse(errText);
            if (errJson.error) errMsg = errJson.error;
        } catch { }
        throw new Error(errMsg);
    }

    return res.json() as Promise<T>;
};
