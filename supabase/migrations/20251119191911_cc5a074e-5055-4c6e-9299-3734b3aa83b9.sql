-- Improve organisation resolution for RLS
-- Use both organisation_users and users tables, falling back safely

CREATE OR REPLACE FUNCTION public.get_user_org()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH org_from_membership AS (
    SELECT ou.organisation_id
    FROM public.organisation_users ou
    JOIN public.users u ON ou.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ou.status = 'active'
    LIMIT 1
  ),
  org_from_user AS (
    SELECT organisation_id
    FROM public.users
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  )
  SELECT COALESCE(
    (SELECT organisation_id FROM org_from_membership),
    (SELECT organisation_id FROM org_from_user)
  );
$$;

-- Simple wrapper kept for backwards compatibility
CREATE OR REPLACE FUNCTION public.get_user_org_fallback()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.get_user_org();
$$;