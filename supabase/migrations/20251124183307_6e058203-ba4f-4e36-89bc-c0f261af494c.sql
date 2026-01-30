-- Replace the UPDATE policy with a simpler, more direct version
DROP POLICY IF EXISTS "org_isolation_update_tickets" ON helpdesk_tickets;

CREATE POLICY "org_isolation_update_tickets"
ON helpdesk_tickets
FOR UPDATE
TO authenticated
USING (
  -- Can only update tickets that are not deleted and belong to user's org/tenant
  (is_deleted = false) 
  AND (
    organisation_id IN (
      SELECT organisation_id FROM users WHERE auth_user_id = auth.uid()
    )
    OR tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  -- Allow updates (including setting is_deleted = true) for user's org/tenant
  organisation_id IN (
    SELECT organisation_id FROM users WHERE auth_user_id = auth.uid()
  )
  OR tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
);

-- Do the same for helpdesk_problems
DROP POLICY IF EXISTS "org_isolation_update_problems" ON helpdesk_problems;

CREATE POLICY "org_isolation_update_problems"
ON helpdesk_problems
FOR UPDATE
TO authenticated
USING (
  -- Can only update problems that are not deleted and belong to user's org/tenant
  (is_deleted = false) 
  AND (
    organisation_id IN (
      SELECT organisation_id FROM users WHERE auth_user_id = auth.uid()
    )
    OR tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  -- Allow updates (including setting is_deleted = true) for user's org/tenant
  organisation_id IN (
    SELECT organisation_id FROM users WHERE auth_user_id = auth.uid()
  )
  OR tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
);