
-- Fix 2: Update bootstrap_session to include ui_settings
CREATE OR REPLACE FUNCTION public.bootstrap_session()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role text;
  _permissions json;
  _name text;
  _email text;
  _ui_settings json;
  _user_id uuid;
  _routes text[] := ARRAY[
    '/', '/tickets', '/assets', '/subscription', '/system-updates',
    '/monitoring', '/reports', '/audit', '/settings'
  ];
BEGIN
  -- Get user role
  SELECT role::text INTO _role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Get user name, email, and internal user id
  SELECT id, name, email INTO _user_id, _name, _email
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- Get UI settings
  SELECT ui_settings INTO _ui_settings
  FROM public.user_preferences
  WHERE user_id = _user_id
  LIMIT 1;

  -- If admin, all permissions are true (skip individual checks)
  IF _role = 'admin' THEN
    SELECT json_object_agg(r, true)
    INTO _permissions
    FROM unnest(_routes) AS r;
  ELSE
    SELECT json_object_agg(route, has_access)
    INTO _permissions
    FROM public.check_multiple_routes_access(_routes);
  END IF;

  RETURN json_build_object(
    'role', _role,
    'permissions', COALESCE(_permissions, '{}'::json),
    'name', _name,
    'email', _email,
    'ui_settings', _ui_settings
  );
END;
$function$;

-- Fix 3: Create get_itam_stats RPC
CREATE OR REPLACE FUNCTION public.get_itam_stats()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN json_build_object(
    'totalAssets', (SELECT count(*) FROM public.itam_assets),
    'assigned', (SELECT count(*) FROM public.itam_asset_assignments WHERE returned_at IS NULL),
    'licenses', (SELECT count(*) FROM public.itam_licenses WHERE is_active = true)
  );
END;
$function$;
