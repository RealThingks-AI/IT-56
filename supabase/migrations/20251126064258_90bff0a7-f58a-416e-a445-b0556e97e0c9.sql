-- Add unique constraint to itam_assets.asset_id
ALTER TABLE itam_assets
ADD CONSTRAINT unique_itam_asset_id UNIQUE (asset_id);

-- Create index for better performance on asset_id lookups
CREATE INDEX IF NOT EXISTS idx_itam_assets_asset_id ON itam_assets(asset_id);

-- Create a function to get the next asset ID number
CREATE OR REPLACE FUNCTION get_next_asset_number(p_organisation_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_number INTEGER;
  prefix_text TEXT;
BEGIN
  -- Get the prefix from tag format
  SELECT prefix INTO prefix_text
  FROM itam_tag_format
  WHERE organisation_id = p_organisation_id
  LIMIT 1;
  
  -- If no prefix found, use default
  IF prefix_text IS NULL THEN
    prefix_text := 'AS-';
  END IF;
  
  -- Get the maximum number from existing asset IDs
  SELECT COALESCE(
    MAX(
      CAST(
        REGEXP_REPLACE(
          SUBSTRING(asset_id FROM LENGTH(prefix_text) + 1),
          '[^0-9]',
          '',
          'g'
        ) AS INTEGER
      )
    ),
    0
  ) INTO max_number
  FROM itam_assets
  WHERE organisation_id = p_organisation_id
    AND asset_id LIKE prefix_text || '%';
  
  -- Return the next number
  RETURN max_number + 1;
END;
$$;