
-- Create a security definer function to check if user belongs to org/tenant
CREATE OR REPLACE FUNCTION public.user_belongs_to_org_or_tenant(
  _organisation_id uuid,
  _tenant_id bigint
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
      AND organisation_id = _organisation_id
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND tenant_id = _tenant_id
  );
$$;

-- Replace the UPDATE policy for helpdesk_tickets with one using the function
DROP POLICY IF EXISTS "org_isolation_update_tickets" ON helpdesk_tickets;

CREATE POLICY "org_isolation_update_tickets"
ON helpdesk_tickets
FOR UPDATE
TO authenticated
USING (
  -- Can only update tickets that are not deleted
  (is_deleted = false) 
  AND user_belongs_to_org_or_tenant(organisation_id, tenant_id)
)
WITH CHECK (
  -- Allow updates for user's org/tenant  
  user_belongs_to_org_or_tenant(organisation_id, tenant_id)
);

-- Do the same for helpdesk_problems
DROP POLICY IF EXISTS "org_isolation_update_problems" ON helpdesk_problems;

CREATE POLICY "org_isolation_update_problems"
ON helpdesk_problems
FOR UPDATE
TO authenticated
USING (
  -- Can only update problems that are not deleted
  (is_deleted = false) 
  AND user_belongs_to_org_or_tenant(organisation_id, tenant_id)
)
WITH CHECK (
  -- Allow updates for user's org/tenant
  user_belongs_to_org_or_tenant(organisation_id, tenant_id)
);
