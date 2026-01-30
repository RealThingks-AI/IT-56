-- Create RLS policies for itam_assets table
-- Allow users to select assets from their organization
CREATE POLICY "Users can view assets from their organization"
ON itam_assets
FOR SELECT
USING (
  organisation_id IN (
    SELECT organisation_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
  )
  OR tenant_id::text = (auth.jwt() ->> 'tenant_id')
);

-- Allow users to insert assets for their organization
CREATE POLICY "Users can insert assets for their organization"
ON itam_assets
FOR INSERT
WITH CHECK (
  organisation_id IN (
    SELECT organisation_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
  )
  OR tenant_id::text = (auth.jwt() ->> 'tenant_id')
);

-- Allow users to update assets from their organization
CREATE POLICY "Users can update assets from their organization"
ON itam_assets
FOR UPDATE
USING (
  organisation_id IN (
    SELECT organisation_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
  )
  OR tenant_id::text = (auth.jwt() ->> 'tenant_id')
);

-- Allow users to soft delete assets (via is_deleted flag)
CREATE POLICY "Users can soft delete assets from their organization"
ON itam_assets
FOR UPDATE
USING (
  organisation_id IN (
    SELECT organisation_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
  )
  OR tenant_id::text = (auth.jwt() ->> 'tenant_id')
)
WITH CHECK (is_deleted = true);