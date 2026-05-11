-- 1. Enable Extensions First
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Categories Table
CREATE TABLE categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT
);
CREATE INDEX idx_categories_slug ON categories(slug);

-- 3. Tools Table
CREATE TABLE tools (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Prompts Table
CREATE TABLE prompts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    prompt_text TEXT NOT NULL,
    negative_prompt TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    preview_image_url TEXT,
    tags TEXT[],
    supported_tools TEXT[],
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    aspect_ratio TEXT,
    prompt_type TEXT CHECK (prompt_type IN ('text-to-image', 'text-to-text', 'text-to-video')),
    is_trending BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    status TEXT CHECK (status IN ('draft', 'pending', 'published', 'rejected', 'archived')) DEFAULT 'published',
    view_count INTEGER DEFAULT 0,
    copy_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Prompts (Optimized for Pagination & Filtering)
CREATE INDEX idx_prompts_slug ON prompts(slug);
CREATE INDEX idx_prompts_status_created ON prompts(status, created_at DESC);
CREATE INDEX idx_prompts_category_status ON prompts(category_id, status);
CREATE INDEX idx_prompts_trending ON prompts(is_trending);
-- Function to safely convert tags to string for indexing
CREATE OR REPLACE FUNCTION immutable_array_to_string(arr TEXT[], sep TEXT)
RETURNS TEXT IMMUTABLE LANGUAGE sql AS $$
  SELECT array_to_string(arr, sep);
$$;

-- Trigram search index (using COALESCE to prevent NULLing the whole string)
CREATE INDEX prompts_search_idx ON prompts USING GIN (
  (COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(immutable_array_to_string(tags, ' '), '')) gin_trgm_ops
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_prompts_updated_at
BEFORE UPDATE ON prompts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5. Profiles Table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Submissions Table
CREATE TABLE submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Likes Table
CREATE TABLE likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Saves Table
CREATE TABLE saves (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Row Level Security (RLS)
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Public Read for Published Prompts
CREATE POLICY "Public prompts are viewable"
ON prompts
FOR SELECT
USING (status = 'published');

-- Admin Manage Prompts
CREATE POLICY "Admins can modify prompts"
ON prompts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Category Policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public categories are viewable" ON categories FOR SELECT USING (true);
CREATE POLICY "Admins can modify categories" ON categories FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Tool Policies
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public tools are viewable" ON tools FOR SELECT USING (true);
CREATE POLICY "Admins can modify tools" ON tools FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- 10. Storage Bucket & Policies (Run these manually or via API)
INSERT INTO storage.buckets (id, name, public) VALUES ('prompt-images', 'prompt-images', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public Image Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'prompt-images' );

CREATE POLICY "Admin Image Upload Access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'prompt-images'
  AND (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
);

CREATE POLICY "Admin Image Update Access"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'prompt-images'
  AND (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
);

CREATE POLICY "Admin Image Delete Access"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'prompt-images'
  AND (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
);
