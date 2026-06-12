-- 1. Full-Text Search View
-- Creates a view that concatenates title, description, and tags for high-performance trigram search.
CREATE OR REPLACE VIEW prompts_search_view
WITH (security_invoker = true) AS
SELECT *, 
  (COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(immutable_array_to_string(tags, ' '), '')) AS search_vector
FROM prompts;

-- 2. User Profiles Expansion
-- Adds display name and avatar support to the profiles table.
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create an avatar bucket for storage
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- Storage Policy for Avatars (Allow users to upload their own avatar)
CREATE POLICY "Avatar Upload Policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Reviews & Ratings Table
-- Implementation for community feedback on prompts.
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(prompt_id, user_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reviews are viewable" ON reviews FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);
