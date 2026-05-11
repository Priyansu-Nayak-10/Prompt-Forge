-- PromptForge RLS Migration 002
-- Apply in Supabase Dashboard → SQL Editor
-- Run BEFORE deploying code changes.
-- The backend uses the service role key which bypasses RLS,
-- so all existing /api/* endpoints continue to work correctly.

-- ─── saves ────────────────────────────────────────────────────────────────────
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own saves
CREATE POLICY "Users manage own saves"
    ON saves
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ─── submissions ──────────────────────────────────────────────────────────────
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own submissions
CREATE POLICY "Users insert own submissions"
    ON submissions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can read their own submissions
CREATE POLICY "Users read own submissions"
    ON submissions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can read all submissions
CREATE POLICY "Admins read all submissions"
    ON submissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admins can update submission status / rejection_reason
CREATE POLICY "Admins update submissions"
    ON submissions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ─── profiles ─────────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own profile
CREATE POLICY "Users manage own profile"
    ON profiles
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins read all profiles"
    ON profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p2
            WHERE p2.id = auth.uid()
            AND p2.role = 'admin'
        )
    );

-- ─── likes ────────────────────────────────────────────────────────────────────
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own likes
CREATE POLICY "Users manage own likes"
    ON likes
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Public can read like counts (for display purposes)
CREATE POLICY "Public can count likes"
    ON likes
    FOR SELECT
    USING (true);
