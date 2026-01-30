-- Fix triggers to use correct table and field names
DROP TRIGGER IF EXISTS ticket_created_notification ON tickets;
DROP TRIGGER IF EXISTS ticket_status_update_notification ON tickets;

-- Update notify_ticket_created function to use assignee_id
CREATE OR REPLACE FUNCTION notify_ticket_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify the ticket creator
  IF NEW.created_by IS NOT NULL THEN
    PERFORM create_notification(
      (SELECT auth_user_id FROM users WHERE id = NEW.created_by),
      'Ticket Created',
      'Your ticket "' || NEW.title || '" has been created successfully.',
      'ticket_created',
      NEW.tenant_id,
      NEW.organisation_id
    );
  END IF;
  
  -- Notify assigned user if different from creator
  IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id != NEW.created_by THEN
    PERFORM create_notification(
      (SELECT auth_user_id FROM users WHERE id = NEW.assignee_id),
      'New Ticket Assigned',
      'A new ticket "' || NEW.title || '" has been assigned to you.',
      'ticket_created',
      NEW.tenant_id,
      NEW.organisation_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update notify_ticket_status_update function to use assignee_id
CREATE OR REPLACE FUNCTION notify_ticket_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    -- Notify the ticket creator
    IF NEW.created_by IS NOT NULL THEN
      PERFORM create_notification(
        (SELECT auth_user_id FROM users WHERE id = NEW.created_by),
        'Ticket Status Updated',
        'Your ticket "' || NEW.title || '" status changed to ' || NEW.status || '.',
        'ticket_updated',
        NEW.tenant_id,
        NEW.organisation_id
      );
    END IF;
    
    -- Notify assigned user if different from creator
    IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id != NEW.created_by THEN
      PERFORM create_notification(
        (SELECT auth_user_id FROM users WHERE id = NEW.assignee_id),
        'Ticket Status Updated',
        'Ticket "' || NEW.title || '" status changed to ' || NEW.status || '.',
        'ticket_updated',
        NEW.tenant_id,
        NEW.organisation_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers on the correct table (helpdesk_tickets)
CREATE TRIGGER ticket_created_notification
AFTER INSERT ON helpdesk_tickets
FOR EACH ROW
EXECUTE FUNCTION notify_ticket_created();

CREATE TRIGGER ticket_status_update_notification
AFTER UPDATE ON helpdesk_tickets
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION notify_ticket_status_update();