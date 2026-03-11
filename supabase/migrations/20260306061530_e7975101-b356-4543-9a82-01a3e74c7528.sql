
-- 1. Fix update_user_status: remove invalid 'owner'/'staff' enum comparisons
CREATE OR REPLACE FUNCTION public.update_user_status(target_user_id uuid, new_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_role app_role;
BEGIN
  SELECT role INTO caller_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'manager' THEN 2 
      WHEN 'user' THEN 3
      WHEN 'viewer' THEN 4
    END
  LIMIT 1;
  
  IF caller_role IS NULL OR caller_role != 'admin' THEN
    RAISE EXCEPTION 'Insufficient permissions to update user status';
  END IF;
  
  UPDATE public.users
  SET status = new_status, updated_at = NOW()
  WHERE auth_user_id = target_user_id;
END;
$function$;

-- 2. Fix notify_role_change: remove organisation_id reference
CREATE OR REPLACE FUNCTION public.notify_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.role != NEW.role THEN
    PERFORM create_notification(
      NEW.auth_user_id,
      'Role Changed',
      'Your role has been updated to ' || NEW.role || '.',
      'role_change',
      NULL,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Fix update_user_role to also sync users.role
CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id uuid, new_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_role text;
  valid_roles text[] := ARRAY['admin', 'manager', 'user', 'viewer'];
BEGIN
  SELECT role::text INTO caller_role 
  FROM public.user_roles 
  WHERE user_id = auth.uid();
  
  IF caller_role IS NULL OR caller_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can update user roles';
  END IF;
  
  IF NOT (new_role = ANY(valid_roles)) THEN
    RAISE EXCEPTION 'Invalid role: %. Valid roles are: admin, manager, user, viewer', new_role;
  END IF;
  
  UPDATE public.user_roles 
  SET role = new_role::public.app_role
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, new_role::public.app_role);
  END IF;

  -- Sync users.role to keep it consistent
  UPDATE public.users SET role = new_role, updated_at = NOW()
  WHERE auth_user_id = target_user_id;
END;
$function$;

-- 4. Attach log_role_change trigger to user_roles
DROP TRIGGER IF EXISTS on_role_change ON public.user_roles;
CREATE TRIGGER on_role_change
  AFTER UPDATE ON public.user_roles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION log_role_change();
