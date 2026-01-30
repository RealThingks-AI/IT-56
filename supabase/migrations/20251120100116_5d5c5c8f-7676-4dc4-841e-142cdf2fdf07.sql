-- Fix the function to properly cast auth.users columns to text
CREATE OR REPLACE FUNCTION public.get_appmaster_admin_details()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  admin_role text,
  is_active boolean,
  permissions jsonb,
  created_at timestamptz,
  created_by uuid,
  updated_at timestamptz,
  email text,
  name text,
  last_login timestamptz,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow super admins to execute this function
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    aa.id,
    aa.user_id,
    aa.admin_role,
    aa.is_active,
    aa.permissions,
    aa.created_at,
    aa.created_by,
    aa.updated_at,
    au.email::text,
    COALESCE((au.raw_user_meta_data->>'name')::text, au.email::text) as name,
    au.last_sign_in_at as last_login,
    CASE WHEN au.banned_until IS NULL THEN 'active' ELSE 'suspended' END::text as status
  FROM public.appmaster_admins aa
  LEFT JOIN auth.users au ON aa.user_id = au.id
  ORDER BY aa.created_at DESC;
END;
$$;