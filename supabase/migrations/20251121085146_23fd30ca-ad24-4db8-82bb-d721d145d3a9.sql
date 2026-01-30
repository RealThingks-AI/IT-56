-- Drop the problematic policies first
DROP POLICY IF EXISTS "Org admins can view org users" ON public.users;
DROP POLICY IF EXISTS "Org admins can update org users" ON public.users;
DROP POLICY IF EXISTS "Org admins can delete org users" ON public.users;

-- Create a security definer function to get user's org and check if they're admin/owner
CREATE OR REPLACE FUNCTION public.get_user_org_if_admin()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organisation_id
  FROM users
  WHERE auth_user_id = auth.uid()
  AND role IN ('admin', 'owner')
  LIMIT 1;
$$;

-- Now create policies using the security definer function
CREATE POLICY "Org admins can view org users"
ON public.users
FOR SELECT
TO authenticated
USING (
  organisation_id = get_user_org_if_admin()
);

CREATE POLICY "Org admins can update org users"
ON public.users
FOR UPDATE
TO authenticated
USING (
  organisation_id = get_user_org_if_admin()
)
WITH CHECK (
  organisation_id = get_user_org_if_admin()
);

CREATE POLICY "Org admins can delete org users"
ON public.users
FOR DELETE
TO authenticated
USING (
  organisation_id = get_user_org_if_admin()
);