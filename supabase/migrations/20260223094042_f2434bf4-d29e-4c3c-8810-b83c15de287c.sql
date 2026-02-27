
-- 1. RLS policies for audit_logs
CREATE POLICY "Authenticated users can view audit logs"
  ON audit_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Also allow service_role / triggers to insert (SECURITY DEFINER functions run as owner, but just in case)
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT TO service_role WITH CHECK (true);

-- 2. Generic audit trigger function
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (action_type, entity_type, entity_id, user_id, metadata)
    VALUES (
      'Created',
      TG_TABLE_NAME,
      NEW.id::text,
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
      NEW.id::text,
      auth.uid(),
      jsonb_build_object('old_values', to_jsonb(OLD), 'new_values', to_jsonb(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (action_type, entity_type, entity_id, user_id, metadata)
    VALUES (
      'Deleted',
      TG_TABLE_NAME,
      OLD.id::text,
      auth.uid(),
      jsonb_build_object('old_values', to_jsonb(OLD))
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Attach triggers to key tables
CREATE TRIGGER audit_trigger_users
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER audit_trigger_itam_assets
  AFTER INSERT OR UPDATE OR DELETE ON public.itam_assets
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER audit_trigger_helpdesk_tickets
  AFTER INSERT OR UPDATE OR DELETE ON public.helpdesk_tickets
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER audit_trigger_helpdesk_problems
  AFTER INSERT OR UPDATE OR DELETE ON public.helpdesk_problems
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER audit_trigger_helpdesk_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.helpdesk_changes
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
