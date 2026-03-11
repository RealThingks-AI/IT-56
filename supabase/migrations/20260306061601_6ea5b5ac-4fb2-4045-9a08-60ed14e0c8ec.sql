
-- Fix notify_role_change to cast type to notification_type enum
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
      'role_change'::notification_type,
      NULL,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$function$;
