-- 003_growth_features.sql
-- Run this in your Supabase SQL Editor

-- ====================================================================================
-- 1. SUBSCRIBERS TABLE (Newsletter)
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
-- Only admins can see subscribers. Anyone can insert.
CREATE POLICY "Anyone can subscribe" ON public.subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view subscribers" ON public.subscribers FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- ====================================================================================
-- 2. COLLECTIONS TABLE (Folders)
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own collections" ON public.collections
    FOR ALL USING (auth.uid() = user_id);

-- ====================================================================================
-- 3. COLLECTION PROMPTS TABLE (Mapping)
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.collection_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(collection_id, prompt_id) -- Prevent duplicate prompts in the same collection
);

ALTER TABLE public.collection_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage prompts in their collections" ON public.collection_prompts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.collections 
            WHERE id = collection_id AND user_id = auth.uid()
        )
    );

-- ====================================================================================
-- MIGRATION OF EXISTING SAVES TO DEFAULT COLLECTION
-- Optional: If you want to migrate existing bookmarks to a default "Saved Prompts" folder
-- ====================================================================================
DO $$
DECLARE
    save_record RECORD;
    default_collection_id UUID;
BEGIN
    FOR save_record IN SELECT * FROM public.saves LOOP
        -- Check if default collection exists for this user
        SELECT id INTO default_collection_id FROM public.collections WHERE user_id = save_record.user_id AND name = 'Saved Prompts' LIMIT 1;
        
        -- If not, create it
        IF default_collection_id IS NULL THEN
            INSERT INTO public.collections (user_id, name, description) 
            VALUES (save_record.user_id, 'Saved Prompts', 'My default saved prompts.')
            RETURNING id INTO default_collection_id;
        END IF;

        -- Insert into collection_prompts
        BEGIN
            INSERT INTO public.collection_prompts (collection_id, prompt_id, created_at)
            VALUES (default_collection_id, save_record.prompt_id, save_record.created_at);
        EXCEPTION WHEN unique_violation THEN
            -- Ignore duplicates
        END;
    END LOOP;
END $$;

-- After successful migration and verification, you can eventually drop the old 'saves' table.
-- DROP TABLE public.saves;
