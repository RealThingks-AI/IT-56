-- Enable RLS on itam_assets if not already enabled
ALTER TABLE itam_assets ENABLE ROW LEVEL SECURITY;

-- Enable RLS on asset_events if not already enabled
ALTER TABLE asset_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them
DROP POLICY IF EXISTS "Users can view assets in their org" ON itam_assets;
DROP POLICY IF EXISTS "Users can insert assets in their org" ON itam_assets;
DROP POLICY IF EXISTS "Users can update assets in their org" ON itam_assets;
DROP POLICY IF EXISTS "Users can soft delete assets in their org" ON itam_assets;

DROP POLICY IF EXISTS "Users can view asset events in their org" ON asset_events;
DROP POLICY IF EXISTS "Users can insert asset events in their org" ON asset_events;

-- Policies for itam_assets table
-- Allow users to view assets in their organization or tenant
CREATE POLICY "Users can view assets in their org"
ON itam_assets
FOR SELECT
USING (
  (organisation_id = get_user_org()) 
  OR 
  (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
);

-- Allow users to insert assets in their organization or tenant
CREATE POLICY "Users can insert assets in their org"
ON itam_assets
FOR INSERT
WITH CHECK (
  (organisation_id = get_user_org()) 
  OR 
  (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
);

-- Allow users to update assets in their organization or tenant
CREATE POLICY "Users can update assets in their org"
ON itam_assets
FOR UPDATE
USING (
  (organisation_id = get_user_org()) 
  OR 
  (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
)
WITH CHECK (
  (organisation_id = get_user_org()) 
  OR 
  (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
);

-- Allow users to soft delete assets (set is_deleted = true) in their organization
CREATE POLICY "Users can soft delete assets in their org"
ON itam_assets
FOR UPDATE
USING (
  (organisation_id = get_user_org()) 
  OR 
  (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
)
WITH CHECK (
  is_deleted = true
  AND
  (
    (organisation_id = get_user_org()) 
    OR 
    (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  )
);

-- Policies for asset_events table
-- Allow users to view asset events in their organization or tenant
CREATE POLICY "Users can view asset events in their org"
ON asset_events
FOR SELECT
USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Allow users to insert asset events in their organization or tenant
CREATE POLICY "Users can insert asset events in their org"
ON asset_events
FOR INSERT
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);