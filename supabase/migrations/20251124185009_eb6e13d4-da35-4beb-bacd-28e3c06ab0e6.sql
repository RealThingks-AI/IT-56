-- Complete fix: Remove reliance on get_user_org() entirely and use direct subqueries
-- Drop and recreate UPDATE policies with direct inline checks that we KNOW work

DROP POLICY IF EXISTS "org_isolation_update_tickets" ON helpdesk_tickets;
DROP POLICY IF EXISTS "org_isolation_update_problems" ON helpdesk_problems;

-- For tickets: Direct subquery approach that bypasses the faulty get_user_org() function
CREATE POLICY "org_isolation_update_tickets"
ON helpdesk_tickets
FOR UPDATE
TO public
USING (
  is_deleted = false
  AND (
    organisation_id IN (
      SELECT organisation_id 
      FROM users 
      WHERE auth_user_id = auth.uid()
    )
    OR tenant_id IN (
      SELECT tenant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  organisation_id IN (
    SELECT organisation_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
  )
  OR tenant_id IN (
    SELECT tenant_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- For problems: Same direct approach
CREATE POLICY "org_isolation_update_problems"
ON helpdesk_problems
FOR UPDATE
TO public
USING (
  is_deleted = false
  AND (
    organisation_id IN (
      SELECT organisation_id 
      FROM users 
      WHERE auth_user_id = auth.uid()
    )
    OR tenant_id IN (
      SELECT tenant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  organisation_id IN (
    SELECT organisation_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
  )
  OR tenant_id IN (
    SELECT tenant_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);