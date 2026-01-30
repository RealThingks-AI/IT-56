
-- Replace UPDATE policies with direct subqueries that we know work
DROP POLICY IF EXISTS "org_isolation_update_tickets" ON helpdesk_tickets;
DROP POLICY IF EXISTS "org_isolation_update_problems" ON helpdesk_problems;

-- Direct subquery approach for tickets
CREATE POLICY "org_isolation_update_tickets"
ON helpdesk_tickets
FOR UPDATE
TO public
USING (
  is_deleted = false
  AND (
    organisation_id IN (SELECT organisation_id FROM users WHERE auth_user_id = auth.uid())
    OR tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  organisation_id IN (SELECT organisation_id FROM users WHERE auth_user_id = auth.uid())
  OR tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Same for problems
CREATE POLICY "org_isolation_update_problems"
ON helpdesk_problems
FOR UPDATE
TO public
USING (
  is_deleted = false
  AND (
    organisation_id IN (SELECT organisation_id FROM users WHERE auth_user_id = auth.uid())
    OR tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  organisation_id IN (SELECT organisation_id FROM users WHERE auth_user_id = auth.uid())
  OR tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);
