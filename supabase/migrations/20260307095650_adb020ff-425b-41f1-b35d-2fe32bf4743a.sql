
-- Update any assets with retired/lost status to available
UPDATE itam_assets SET status = 'available' WHERE status IN ('retired', 'lost');

-- Drop old CHECK constraint and recreate without retired/lost
ALTER TABLE itam_assets DROP CONSTRAINT IF EXISTS itam_assets_status_check;
ALTER TABLE itam_assets ADD CONSTRAINT itam_assets_status_check CHECK (status IN ('available', 'in_use', 'maintenance', 'disposed'));
