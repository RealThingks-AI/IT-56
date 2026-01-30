-- Create category_tag_formats table with correct data types
CREATE TABLE IF NOT EXISTS category_tag_formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id integer NOT NULL REFERENCES itam_categories(id) ON DELETE CASCADE,
  prefix text NOT NULL,
  current_number integer NOT NULL DEFAULT 1,
  zero_padding integer NOT NULL DEFAULT 2,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  organisation_id uuid REFERENCES organisations(id),
  tenant_id bigint NOT NULL,
  UNIQUE(category_id, organisation_id)
);

-- Enable RLS
ALTER TABLE category_tag_formats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view category tag formats in their org"
  ON category_tag_formats FOR SELECT
  USING (
    organisation_id = get_user_org() OR
    (organisation_id IS NULL AND tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert category tag formats in their org"
  ON category_tag_formats FOR INSERT
  WITH CHECK (
    organisation_id = get_user_org() OR
    (organisation_id IS NULL AND tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ))
  );

CREATE POLICY "Users can update category tag formats in their org"
  ON category_tag_formats FOR UPDATE
  USING (
    organisation_id = get_user_org() OR
    (organisation_id IS NULL AND tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ))
  );

CREATE POLICY "Users can delete category tag formats in their org"
  ON category_tag_formats FOR DELETE
  USING (
    organisation_id = get_user_org() OR
    (organisation_id IS NULL AND tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ))
  );

-- Create index for faster lookups
CREATE INDEX idx_category_tag_formats_category ON category_tag_formats(category_id);
CREATE INDEX idx_category_tag_formats_org ON category_tag_formats(organisation_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_category_tag_formats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_category_tag_formats_updated_at
  BEFORE UPDATE ON category_tag_formats
  FOR EACH ROW
  EXECUTE FUNCTION update_category_tag_formats_updated_at();