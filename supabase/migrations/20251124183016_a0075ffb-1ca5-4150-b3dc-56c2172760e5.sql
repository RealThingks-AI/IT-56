-- Remove conflicting soft delete policy for tickets
DROP POLICY IF EXISTS "org_isolation_soft_delete_tickets" ON helpdesk_tickets;

-- The org_isolation_update_tickets policy should already be correct from the previous migration
-- But let's ensure it's properly set up to allow soft deletes
DROP POLICY IF EXISTS "org_isolation_update_tickets" ON helpdesk_tickets;

CREATE POLICY "org_isolation_update_tickets"
ON helpdesk_tickets
FOR UPDATE
TO authenticated
USING (
  -- Can only update records that are not deleted and belong to user's org/tenant
  (is_deleted = false) 
  AND (
    (organisation_id = get_user_org()) 
    OR (tenant_id = ( SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()))
  )
)
WITH CHECK (
  -- Allow any update (including setting is_deleted = true) as long as it belongs to user's org/tenant
  (organisation_id = get_user_org()) 
  OR (tenant_id = ( SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()))
);