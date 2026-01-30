-- Create itam_tag_format table if it doesn't exist
CREATE TABLE IF NOT EXISTS itam_tag_format (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  prefix TEXT NOT NULL DEFAULT 'AS-',
  start_number TEXT NOT NULL DEFAULT '0001',
  padding_length INTEGER NOT NULL DEFAULT 6,
  auto_increment BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add unique constraint for one tag format per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_itam_tag_format_organisation 
ON itam_tag_format(organisation_id);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_itam_tag_format_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_itam_tag_format_updated_at ON itam_tag_format;
CREATE TRIGGER trigger_update_itam_tag_format_updated_at
  BEFORE UPDATE ON itam_tag_format
  FOR EACH ROW
  EXECUTE FUNCTION update_itam_tag_format_updated_at();