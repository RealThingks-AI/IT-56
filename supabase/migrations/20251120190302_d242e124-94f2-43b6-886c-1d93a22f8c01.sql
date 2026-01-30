-- Fix infinite recursion in profiles RLS policies
-- The SELECT policy was recursively querying the profiles table

-- Drop the problematic SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles in their tenant" ON public.profiles;

-- Create a simpler SELECT policy that doesn't cause recursion
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- Create a separate policy for viewing profiles in the same organization
CREATE POLICY "Users can view profiles in their organization"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u1
    WHERE u1.auth_user_id = auth.uid()
    AND u1.organisation_id IN (
      SELECT u2.organisation_id 
      FROM public.users u2 
      WHERE u2.auth_user_id = profiles.id
    )
  )
);