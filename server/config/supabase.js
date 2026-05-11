const { createClient } = require('@supabase/supabase-js');

const supabaseUrl        = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Fail fast in production — a missing credential will cause silent data failures
// that are far harder to debug than a clean startup crash.
if (!supabaseUrl || !supabaseServiceKey) {
    const missing = [
        !supabaseUrl        && 'SUPABASE_URL',
        !supabaseServiceKey && 'SUPABASE_SERVICE_ROLE_KEY',
    ].filter(Boolean).join(', ');

    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            `[Supabase] Missing required environment variables: ${missing}. ` +
            'Set them in your Render environment configuration.'
        );
    } else {
        console.warn(
            `[Supabase] Warning: Missing env vars: ${missing}. ` +
            'API calls will fail. Check your .env file.'
        );
    }
}

// Service-role client — used only on the backend for privileged operations.
// Never expose this key to the frontend.
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession:   false,
    },
});

module.exports = { supabaseAdmin };
