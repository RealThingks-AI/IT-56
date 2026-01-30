-- Add RLS policies for organization admins to manage users in their org

-- Allow organization admins/owners to view users in their organization
CREATE POLICY "Org admins can view org users"
ON public.users
FOR SELECT
TO authenticated
USING (
  organisation_id IN (
    SELECT organisation_id 
    FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Allow organization admins/owners to update users in their organization
CREATE POLICY "Org admins can update org users"
ON public.users
FOR UPDATE
TO authenticated
USING (
  organisation_id IN (
    SELECT organisation_id 
    FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
)
WITH CHECK (
  organisation_id IN (
    SELECT organisation_id 
    FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Allow organization admins/owners to delete users in their organization
CREATE POLICY "Org admins can delete org users"
ON public.users
FOR DELETE
TO authenticated
USING (
  organisation_id IN (
    SELECT organisation_id 
    FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);