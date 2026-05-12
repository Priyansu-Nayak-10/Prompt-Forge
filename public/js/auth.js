import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ─── Runtime Config ────────────────────────────────────────────────────────────
// Credentials are fetched at runtime from the Express server.
// Nothing is hardcoded — no URL, no key committed to source.

let _config = null;

const getConfig = async () => {
    if (_config) return _config;
    if (window.__PF_CONFIG__) { _config = window.__PF_CONFIG__; return _config; }

    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Failed to load app configuration. Please try again.');
    _config = await res.json();
    window.__PF_CONFIG__ = _config; // cache on window for sync accessors
    return _config;
};

// ─── Supabase Client (lazy singleton) ─────────────────────────────────────────
let _client = null;

export const getClient = async () => {
    if (_client) return _client;
    const { url, anonKey } = await getConfig();
    _client = createClient(url, anonKey, {
        auth: {
            persistSession:    true,
            autoRefreshToken:  true,
            detectSessionInUrl: true,
        },
    });
    return _client;
};

// ─── Session Validation ────────────────────────────────────────────────────────
// Uses Supabase SDK which handles token refresh automatically.
// Syncs the refreshed token back to localStorage so api.js authHeader() stays current.

export const getSession = async () => {
    try {
        const sb = await getClient();
        const { data: { session }, error } = await sb.auth.getSession();
        if (error || !session) return null;
        // Keep localStorage in sync with the live (possibly refreshed) token
        localStorage.setItem('sb_access_token', session.access_token);
        localStorage.setItem('sb_user', JSON.stringify(session.user));
        return session;
    } catch {
        return null;
    }
};

// Async, reliable gate — always use this before allowing copy/save/submit
export const isAuthenticated = async () => {
    const session = await getSession();
    return !!session;
};

// Returns a fresh token for API call Authorization headers
export const getAuthToken = async () => {
    const session = await getSession();
    return session?.access_token ?? null;
};

// ─── Auth Actions ──────────────────────────────────────────────────────────────

export const signIn = async (email, password) => {
    const sb = await getClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    localStorage.setItem('sb_access_token', data.session.access_token);
    localStorage.setItem('sb_user', JSON.stringify(data.user));
    return data;
};

export const signUp = async (email, password) => {
    const sb = await getClient();
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    return data;
};

export const signOut = async () => {
    const sb = await getClient();
    await sb.auth.signOut();
    localStorage.removeItem('sb_access_token');
    localStorage.removeItem('sb_user');
};

export const getCachedUser = () => {
    try   { return JSON.parse(localStorage.getItem('sb_user')); }
    catch { return null; }
};

// ─── Route Guards ──────────────────────────────────────────────────────────────

export const requireAuth = async (redirectTo = '/login.html') => {
    const session = await getSession();
    if (!session) {
        const next = encodeURIComponent(window.location.href);
        window.location.href = `${redirectTo}?next=${next}`;
        return null;
    }
    return session.user;
};

/**
 * Securely verify that a user is both authenticated and has the 'admin' role.
 * This is used for frontend route guarding.
 */
export const requireAdmin = async (redirectTo = '/login.html') => {
    const user = await requireAuth(redirectTo);
    if (!user) return null;

    try {
        const { fetchUserProfile } = await import('/js/api.js');
        const res = await fetchUserProfile();
        if (res?.data?.role !== 'admin') {
            window.location.href = '/user-dashboard.html';
            return null;
        }
        return user;
    } catch (err) {
        window.location.href = redirectTo;
        return null;
    }
};

export const redirectIfLoggedIn = async (defaultTo = null) => {
    const session = await getSession();
    if (session) {
        const urlParams = new URLSearchParams(window.location.search);
        let targetUrl = urlParams.get('next');
        
        if (!targetUrl) {
            // Determine default dashboard based on role
            try {
                const { fetchUserProfile } = await import('/js/api.js');
                const res = await fetchUserProfile();
                const role = res?.data?.role || 'user';
                targetUrl = role === 'admin' ? '/dashboard.html' : '/user-dashboard.html';
            } catch (err) {
                targetUrl = '/user-dashboard.html';
            }
        }
        
        // If the caller provided a hardcoded defaultTo that isn't dashboard.html (e.g. for preserving state), use it.
        // Otherwise, use our smart targetUrl.
        window.location.href = defaultTo && defaultTo !== '/dashboard.html' ? defaultTo : targetUrl;
    }
};
