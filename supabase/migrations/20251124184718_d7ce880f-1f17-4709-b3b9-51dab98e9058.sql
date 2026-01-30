-- Replace get_user_org() function to properly return org from users table
-- Don't drop it, just replace it to avoid dependency issues
CREATE OR REPLACE FUNCTION public.get_user_org()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organisation_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Now recreate the UPDATE policies to use the function
DROP POLICY IF EXISTS "org_isolation_update_tickets" ON helpdesk_tickets;
DROP POLICY IF EXISTS "org_isolation_update_problems" ON helpdesk_problems;

CREATE POLICY "org_isolation_update_tickets"
ON helpdesk_tickets
FOR UPDATE
TO public
USING (
  is_deleted = false
  AND (
    organisation_id = get_user_org()
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  organisation_id = get_user_org()
  OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "org_isolation_update_problems"
ON helpdesk_problems
FOR UPDATE
TO public
USING (
  is_deleted = false
  AND (
    organisation_id = get_user_org()
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  organisation_id = get_user_org()
  OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);