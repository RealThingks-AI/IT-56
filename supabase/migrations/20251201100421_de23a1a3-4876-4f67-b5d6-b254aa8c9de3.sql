-- Drop existing restrictive policy
DROP POLICY IF EXISTS org_isolation_manage_helpdesk_categories ON public.helpdesk_categories;

-- Create a proper policy for org admins to manage categories
CREATE POLICY "org_admins_can_manage_categories"
ON public.helpdesk_categories
FOR ALL
TO authenticated
USING (
  -- Allow if user belongs to the same organisation
  organisation_id = (
    SELECT organisation_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid()
  )
  -- OR if they're org admin or super admin
  AND (
    EXISTS (
      SELECT 1 FROM public.user_org_map
      WHERE user_id = auth.uid()
      AND role IN ('org_admin', 'super_admin')
      AND organisation_id = helpdesk_categories.organisation_id
    )
    -- OR if user has admin/owner role in users table
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'owner')
      AND organisation_id = helpdesk_categories.organisation_id
    )
  )
)
WITH CHECK (
  -- Allow insert/update if user belongs to the same organisation
  organisation_id = (
    SELECT organisation_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid()
  )
  -- AND they're org admin or super admin
  AND (
    EXISTS (
      SELECT 1 FROM public.user_org_map
      WHERE user_id = auth.uid()
      AND role IN ('org_admin', 'super_admin')
      AND organisation_id = helpdesk_categories.organisation_id
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'owner')
      AND organisation_id = helpdesk_categories.organisation_id
    )
  )
);