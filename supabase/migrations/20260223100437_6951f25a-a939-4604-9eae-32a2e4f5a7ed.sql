
CREATE OR REPLACE FUNCTION public.fn_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (action_type, entity_type, entity_id, user_id, metadata)
    VALUES (
      'Created',
      TG_TABLE_NAME,
      NEW.id,
      auth.uid(),
      jsonb_build_object('name', COALESCE(
        CASE WHEN TG_TABLE_NAME = 'users' THEN NEW.name END,
        CASE WHEN TG_TABLE_NAME IN ('helpdesk_tickets','helpdesk_problems','helpdesk_changes') THEN NEW.title END,
        CASE WHEN TG_TABLE_NAME = 'itam_assets' THEN NEW.asset_tag END,
        ''
      ))
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (action_type, entity_type, entity_id, user_id, metadata)
    VALUES (
      'Updated',
      TG_TABLE_NAME,
      NEW.id,
      auth.uid(),
      jsonb_build_object('old_values', to_jsonb(OLD), 'new_values', to_jsonb(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (action_type, entity_type, entity_id, user_id, metadata)
    VALUES (
      'Deleted',
      TG_TABLE_NAME,
      OLD.id,
      auth.uid(),
      jsonb_build_object('old_values', to_jsonb(OLD))
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;
