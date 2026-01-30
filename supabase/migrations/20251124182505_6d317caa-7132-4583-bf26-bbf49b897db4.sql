-- Fix RLS policy for helpdesk_problems to allow soft deletes
-- The current policy blocks updates when is_deleted = true
-- We need to modify the UPDATE policy to allow setting is_deleted = true

DROP POLICY IF EXISTS "org_isolation_update_problems" ON helpdesk_problems;

CREATE POLICY "org_isolation_update_problems"
ON helpdesk_problems
FOR UPDATE
TO authenticated
USING (
  (is_deleted = false) 
  AND (
    (organisation_id = get_user_org()) 
    OR (tenant_id = ( SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()))
  )
)
WITH CHECK (
  -- Allow setting is_deleted to true OR updating non-deleted records
  -- as long as they belong to the user's org/tenant
  (organisation_id = get_user_org()) 
  OR (tenant_id = ( SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()))
);

-- Similarly fix the tickets policy if it has the same issue
DROP POLICY IF EXISTS "org_isolation_update_tickets" ON helpdesk_tickets;

CREATE POLICY "org_isolation_update_tickets"
ON helpdesk_tickets
FOR UPDATE
TO authenticated
USING (
  (is_deleted = false) 
  AND (
    (organisation_id = get_user_org()) 
    OR (tenant_id = ( SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()))
  )
)
WITH CHECK (
  -- Allow setting is_deleted to true OR updating non-deleted records
  (organisation_id = get_user_org()) 
  OR (tenant_id = ( SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()))
);