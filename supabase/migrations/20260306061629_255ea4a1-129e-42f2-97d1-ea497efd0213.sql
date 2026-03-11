
-- Fix create_notification (notification_type overload) to not reference organisation_id
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_title text, p_message text, p_type notification_type, p_tenant_id bigint DEFAULT NULL::bigint, p_organisation_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, tenant_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_tenant_id)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$function$;

-- Also fix the text overload
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_title text, p_message text, p_type text DEFAULT 'info'::text, p_tenant_id bigint DEFAULT NULL::bigint, p_organisation_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, tenant_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_tenant_id)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$function$;
