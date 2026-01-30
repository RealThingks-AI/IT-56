-- Fix the log_ticket_changes function to use correct UUID type for user_id
CREATE OR REPLACE FUNCTION public.log_ticket_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  action_field TEXT;
  current_user_id UUID;
BEGIN
  -- Get the user_id from the users table based on auth.uid()
  SELECT id INTO current_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'helpdesk_ticket_history' 
               AND column_name = 'action') THEN
      INSERT INTO helpdesk_ticket_history (
        ticket_id, tenant_id, action, old_value, new_value, user_id
      ) VALUES (
        NEW.id, NEW.tenant_id, 'status_changed', OLD.status, NEW.status, current_user_id
      );
    ELSE
      INSERT INTO helpdesk_ticket_history (
        ticket_id, tenant_id, field_name, old_value, new_value, user_id
      ) VALUES (
        NEW.id, NEW.tenant_id, 'status', OLD.status, NEW.status, current_user_id
      );
    END IF;
  END IF;
  
  -- Log priority changes
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'helpdesk_ticket_history' 
               AND column_name = 'action') THEN
      INSERT INTO helpdesk_ticket_history (
        ticket_id, tenant_id, action, old_value, new_value, user_id
      ) VALUES (
        NEW.id, NEW.tenant_id, 'priority_changed', OLD.priority, NEW.priority, current_user_id
      );
    ELSE
      INSERT INTO helpdesk_ticket_history (
        ticket_id, tenant_id, field_name, old_value, new_value, user_id
      ) VALUES (
        NEW.id, NEW.tenant_id, 'priority', OLD.priority, NEW.priority, current_user_id
      );
    END IF;
  END IF;
  
  -- Log assignee changes
  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'helpdesk_ticket_history' 
               AND column_name = 'action') THEN
      INSERT INTO helpdesk_ticket_history (
        ticket_id, tenant_id, action, old_value, new_value, user_id
      ) VALUES (
        NEW.id, NEW.tenant_id, 'assignee_changed', 
        OLD.assignee_id::TEXT, NEW.assignee_id::TEXT, current_user_id
      );
    ELSE
      INSERT INTO helpdesk_ticket_history (
        ticket_id, tenant_id, field_name, old_value, new_value, user_id
      ) VALUES (
        NEW.id, NEW.tenant_id, 'assignee', 
        OLD.assignee_id::TEXT, NEW.assignee_id::TEXT, current_user_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;