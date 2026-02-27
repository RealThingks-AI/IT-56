
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

  -- Get user name and email
  SELECT name, email INTO _name, _email
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- If admin, all permissions are true (skip individual checks)
  IF _role = 'admin' THEN
    SELECT json_object_agg(r, true)
    INTO _permissions
    FROM unnest(_routes) AS r;
  ELSE
    -- Check each route using existing function
    SELECT json_object_agg(route, has_access)
    INTO _permissions
    FROM public.check_multiple_routes_access(_routes);
  END IF;

  RETURN json_build_object(
    'role', _role,
    'permissions', COALESCE(_permissions, '{}'::json),
    'name', _name,
    'email', _email
  );
END;
$function$;
