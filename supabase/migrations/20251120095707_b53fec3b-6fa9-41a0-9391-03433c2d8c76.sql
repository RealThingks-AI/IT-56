-- Create a view to properly show appmaster admin details with auth user data
CREATE OR REPLACE VIEW public.appmaster_admins_with_user_details AS
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

-- Grant select permission to authenticated users (will be controlled by RLS)
GRANT SELECT ON public.appmaster_admins_with_user_details TO authenticated;

-- Add RLS policy for super admins to view this
ALTER VIEW public.appmaster_admins_with_user_details SET (security_invoker = on);