import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://uylxmllxamruddnsvdwp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5bHhtbGx4YW1ydWRkbnN2ZHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0ODMxMjQsImV4cCI6MjA5NDA1OTEyNH0.7OC-VSboYQcQxwNoO4RYoFlVch9h-zvj3ye-yNpWRY8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Sign in with email + password. Stores token for API calls.
 */
export const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    localStorage.setItem('sb_access_token', data.session.access_token);
    localStorage.setItem('sb_user', JSON.stringify(data.user));
    return data;
};

/**
 * Register a new user with email + password.
 * Supabase sends a confirmation email automatically.
 * Does NOT auto-login — user must confirm email first.
 */
export const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
};

/**
 * Sign out and clean up local state.
 */
export const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('sb_access_token');
    localStorage.removeItem('sb_user');
};

/**
 * Returns cached user from localStorage (sync, no network).
 */
export const getCachedUser = () => {
    try {
        return JSON.parse(localStorage.getItem('sb_user'));
    } catch {
        return null;
    }
};

/**
 * Verifies session is still valid by calling Supabase.
 * Use on page load for protected pages.
 */
export const requireAdmin = async (redirectTo = '/login.html') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = redirectTo;
        return null;
    }
    // Refresh local token in case it rotated
    localStorage.setItem('sb_access_token', session.access_token);
    return session.user;
};

/**
 * Redirects away from login page if already authenticated.
 */
export const redirectIfLoggedIn = async (to = '/dashboard.html') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) window.location.href = to;
};
