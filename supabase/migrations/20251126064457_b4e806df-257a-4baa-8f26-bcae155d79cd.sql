-- Enable RLS on itam_tag_format
ALTER TABLE itam_tag_format ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view tag format for their organization
CREATE POLICY "Users can view their organization's tag format"
ON itam_tag_format FOR SELECT
USING (
  organisation_id IN (
    SELECT organisation_id FROM users WHERE auth_user_id = auth.uid()
  )
);

-- Policy: Admins can insert tag format for their organization
CREATE POLICY "Admins can create tag format for their organization"
ON itam_tag_format FOR INSERT
WITH CHECK (
  organisation_id IN (
    SELECT organisation_id FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Policy: Admins can update tag format for their organization
CREATE POLICY "Admins can update their organization's tag format"
ON itam_tag_format FOR UPDATE
USING (
  organisation_id IN (
    SELECT organisation_id FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Policy: Admins can delete tag format for their organization
CREATE POLICY "Admins can delete their organization's tag format"
ON itam_tag_format FOR DELETE
USING (
  organisation_id IN (
    SELECT organisation_id FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);