-- Add like_count cache column to prompts
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Function to handle like count increment/decrement
CREATE OR REPLACE FUNCTION update_prompt_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE prompts SET like_count = like_count + 1 WHERE id = NEW.prompt_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE prompts SET like_count = like_count - 1 WHERE id = OLD.prompt_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger on likes table
DROP TRIGGER IF EXISTS trg_update_prompt_like_count ON likes;
CREATE TRIGGER trg_update_prompt_like_count
AFTER INSERT OR DELETE ON likes
FOR EACH ROW
EXECUTE FUNCTION update_prompt_like_count();

-- Backfill existing likes count
UPDATE prompts p
SET like_count = (
  SELECT COUNT(*) FROM likes l WHERE l.prompt_id = p.id
);
