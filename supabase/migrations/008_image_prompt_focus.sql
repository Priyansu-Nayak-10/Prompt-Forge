-- Focus PromptForge on AI image generation and transformation prompts.

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS preview_image_url TEXT;

INSERT INTO categories (name, slug, icon) VALUES
('Portrait', 'portrait', 'POR'),
('Character Design', 'character-design', 'CHR'),
('Anime', 'anime', 'ANI'),
('Fantasy', 'fantasy', 'FAN'),
('Product Photography', 'product-photography', 'PRO'),
('Architecture', 'architecture', 'ARC'),
('Concept Art', 'concept-art', 'CON'),
('Fashion', 'fashion', 'FAS'),
('Landscape', 'landscape', 'LAN'),
('Logo Design', 'logo-design', 'LOG'),
('Image Editing', 'image-editing', 'EDT'),
('Image Transformation', 'image-transformation', 'TRN')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tools (name, slug) VALUES
('Midjourney', 'midjourney'),
('FLUX', 'flux'),
('Stable Diffusion', 'stable-diffusion'),
('Ideogram', 'ideogram'),
('DALL-E', 'dall-e'),
('Leonardo AI', 'leonardo-ai'),
('Firefly', 'firefly')
ON CONFLICT (slug) DO NOTHING;

UPDATE prompts
SET prompt_type = 'text-to-image'
WHERE prompt_type IS NULL;

UPDATE prompts
SET status = 'archived'
WHERE prompt_type <> 'text-to-image';

UPDATE prompts
SET prompt_type = 'text-to-image'
WHERE prompt_type <> 'text-to-image';

UPDATE submissions
SET prompt_type = 'text-to-image'
WHERE prompt_type IS NULL;

UPDATE submissions
SET status = 'rejected',
    rejection_reason = COALESCE(rejection_reason, 'Non-image prompt type removed during image-platform refocus.')
WHERE prompt_type <> 'text-to-image';

UPDATE submissions
SET prompt_type = 'text-to-image'
WHERE prompt_type <> 'text-to-image';

ALTER TABLE prompts
DROP CONSTRAINT IF EXISTS prompts_prompt_type_check;

ALTER TABLE prompts
ADD CONSTRAINT prompts_prompt_type_check
CHECK (prompt_type = 'text-to-image');

ALTER TABLE submissions
DROP CONSTRAINT IF EXISTS submissions_prompt_type_check;

ALTER TABLE submissions
ADD CONSTRAINT submissions_prompt_type_check
CHECK (prompt_type = 'text-to-image');
