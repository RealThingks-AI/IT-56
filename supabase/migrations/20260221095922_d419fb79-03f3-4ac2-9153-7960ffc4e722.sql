
-- Fix existing duplicates: rename newer duplicates by appending '-DUP-' and first 8 chars of UUID
UPDATE itam_assets
SET asset_tag = asset_tag || '-DUP-' || LEFT(id::text, 8),
    asset_id = asset_id || '-DUP-' || LEFT(id::text, 8)
WHERE id IN (
  SELECT id FROM (
    SELECT id, asset_tag, ROW_NUMBER() OVER (PARTITION BY asset_tag ORDER BY created_at ASC) as rn
    FROM itam_assets
    WHERE is_active = true
    AND asset_tag IS NOT NULL
  ) dupes
  WHERE rn > 1
);

-- Enforce uniqueness for active assets
CREATE UNIQUE INDEX IF NOT EXISTS idx_itam_assets_unique_asset_tag
ON itam_assets (asset_tag) WHERE is_active = true;
