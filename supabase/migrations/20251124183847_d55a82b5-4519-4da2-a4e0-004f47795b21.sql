
-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "org_isolation_update_tickets" ON helpdesk_tickets;
DROP POLICY IF EXISTS "org_isolation_update_problems" ON helpdesk_problems;

-- Create simpler UPDATE policy for tickets using direct inline checks
CREATE POLICY "org_isolation_update_tickets"
ON helpdesk_tickets
FOR UPDATE
TO authenticated
USING (
  -- Can only select/start updating tickets that aren't deleted and belong to user's org
  (is_deleted = false)
  AND (
    organisation_id = (SELECT organisation_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1)
  )
)
WITH CHECK (
  -- Allow the update to complete if user belongs to org/tenant (no is_deleted check here)
  organisation_id = (SELECT organisation_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
  OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1)
);

-- Same for problems
CREATE POLICY "org_isolation_update_problems"
ON helpdesk_problems  
FOR UPDATE
TO authenticated
USING (
  -- Can only select/start updating problems that aren't deleted and belong to user's org
  (is_deleted = false)
  AND (
    organisation_id = (SELECT organisation_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1)
  )
)
WITH CHECK (
  -- Allow the update to complete if user belongs to org/tenant (no is_deleted check here)
  organisation_id = (SELECT organisation_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
  OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1)
);
