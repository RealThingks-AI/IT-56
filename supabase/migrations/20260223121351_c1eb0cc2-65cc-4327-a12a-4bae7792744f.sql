
CREATE OR REPLACE FUNCTION public.fn_audit_log()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _app_user_id uuid;
BEGIN
  -- Resolve auth.uid() to internal users.id
  SELECT id INTO _app_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (action_type, entity_type, entity_id, user_id, metadata)
    VALUES (
      'Created',
      TG_TABLE_NAME,
      NEW.id,
      _app_user_id,
      jsonb_build_object('name', CASE
        WHEN TG_TABLE_NAME = 'users' THEN (to_jsonb(NEW)->>'name')
        WHEN TG_TABLE_NAME IN ('helpdesk_tickets','helpdesk_problems','helpdesk_changes') THEN (to_jsonb(NEW)->>'title')
        WHEN TG_TABLE_NAME = 'itam_assets' THEN (to_jsonb(NEW)->>'asset_tag')
        ELSE ''
      END)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - 'last_login' - 'updated_at') IS NOT DISTINCT FROM
       (to_jsonb(OLD) - 'last_login' - 'updated_at') THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.audit_logs (action_type, entity_type, entity_id, user_id, metadata)
    VALUES (
      'Updated',
      TG_TABLE_NAME,
      NEW.id,
      _app_user_id,
      jsonb_build_object('old_values', to_jsonb(OLD), 'new_values', to_jsonb(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (action_type, entity_type, entity_id, user_id, metadata)
    VALUES (
      'Deleted',
      TG_TABLE_NAME,
      OLD.id,
      _app_user_id,
      jsonb_build_object('old_values', to_jsonb(OLD))
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;
