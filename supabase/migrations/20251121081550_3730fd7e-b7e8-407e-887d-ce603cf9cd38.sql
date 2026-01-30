-- Fix search_path for trigger functions to address security warnings

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION log_tool_assignment()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (action_type, entity_type, entity_id, user_id, metadata)
    VALUES (
      'tool_assigned',
      'user_tools',
      NEW.id,
      (SELECT id FROM users WHERE auth_user_id = auth.uid()),
      jsonb_build_object(
        'user_id', NEW.user_id,
        'tool_id', NEW.tool_id,
        'assigned_by', NEW.assigned_by
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (action_type, entity_type, entity_id, user_id, metadata)
    VALUES (
      'tool_unassigned',
      'user_tools',
      OLD.id,
      (SELECT id FROM users WHERE auth_user_id = auth.uid()),
      jsonb_build_object(
        'user_id', OLD.user_id,
        'tool_id', OLD.tool_id
      )
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;