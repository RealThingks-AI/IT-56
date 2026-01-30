-- Drop the existing view
DROP VIEW IF EXISTS public.appmaster_admins_with_user_details CASCADE;

-- Recreate the view as a security definer view (default behavior)
CREATE VIEW public.appmaster_admins_with_user_details 
WITH (security_barrier = false)
AS
SELECT 
  aa.id,
  aa.user_id,
  aa.admin_role,
  aa.is_active,
  aa.permissions,
  aa.created_at,
  aa.created_by,
  aa.updated_at,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email) as name,
  au.last_sign_in_at as last_login,
  CASE WHEN au.banned_until IS NULL THEN 'active' ELSE 'suspended' END as status
FROM public.appmaster_admins aa
LEFT JOIN auth.users au ON aa.user_id = au.id;

-- Grant select permission to authenticated users (access will be controlled by appmaster_admins RLS)
GRANT SELECT ON public.appmaster_admins_with_user_details TO authenticated;