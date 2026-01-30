-- Fix get_user_org() function to query from organisation_users instead of users
-- This resolves RLS policy violations when inserting vendors

CREATE OR REPLACE FUNCTION public.get_user_org()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT organisation_id
  FROM public.organisation_users
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;

-- Alternative: Also create a simpler version that gets the first organisation
-- the user is a member of, in case organisation_users doesn't have a record
CREATE OR REPLACE FUNCTION public.get_user_org_fallback()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- First try organisation_users
  SELECT organisation_id
  FROM public.organisation_users
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;