
-- Drop and recreate UPDATE policies to match INSERT/SELECT patterns exactly
DROP POLICY IF EXISTS "org_isolation_update_tickets" ON helpdesk_tickets;
DROP POLICY IF EXISTS "org_isolation_update_problems" ON helpdesk_problems;

-- Create UPDATE policy for tickets matching the same pattern as SELECT/INSERT
CREATE POLICY "org_isolation_update_tickets"
ON helpdesk_tickets
FOR UPDATE
TO public
USING (
  -- Can only update tickets that aren't deleted and belong to user's org
  (is_deleted = false)
  AND (
    organisation_id = get_user_org()
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  -- Allow updates if user belongs to org/tenant (no is_deleted check)
  organisation_id = get_user_org()
  OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Same for problems
CREATE POLICY "org_isolation_update_problems"
ON helpdesk_problems
FOR UPDATE
TO public
USING (
  -- Can only update problems that aren't deleted and belong to user's org
  (is_deleted = false)
  AND (
    organisation_id = get_user_org()
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  -- Allow updates if user belongs to org/tenant (no is_deleted check)
  organisation_id = get_user_org()
  OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);
