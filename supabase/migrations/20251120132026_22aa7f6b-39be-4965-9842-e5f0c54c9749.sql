-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type notification_type,
  p_tenant_id BIGINT DEFAULT NULL,
  p_organisation_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, tenant_id, organisation_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_tenant_id, p_organisation_id)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Trigger for profile updates
CREATE OR REPLACE FUNCTION notify_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.full_name != NEW.full_name OR OLD.avatar_url != NEW.avatar_url THEN
    PERFORM create_notification(
      NEW.id,
      'Profile Updated',
      'Your profile information has been updated successfully.',
      'profile_update',
      NEW.tenant_id,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profile_update_notification
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION notify_profile_update();

-- Trigger for role changes
CREATE OR REPLACE FUNCTION notify_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role != NEW.role THEN
    PERFORM create_notification(
      NEW.auth_user_id,
      'Role Changed',
      'Your role has been updated to ' || NEW.role || '.',
      'role_change',
      NULL,
      NEW.organisation_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_role_change_notification
AFTER UPDATE ON users
FOR EACH ROW
WHEN (OLD.role IS DISTINCT FROM NEW.role)
EXECUTE FUNCTION notify_role_change();

-- Trigger for new tickets
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
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != NEW.created_by THEN
    PERFORM create_notification(
      (SELECT auth_user_id FROM users WHERE id = NEW.assigned_to),
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

CREATE TRIGGER ticket_created_notification
AFTER INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION notify_ticket_created();

-- Trigger for ticket status updates
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
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != NEW.created_by THEN
      PERFORM create_notification(
        (SELECT auth_user_id FROM users WHERE id = NEW.assigned_to),
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

CREATE TRIGGER ticket_status_update_notification
AFTER UPDATE ON tickets
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION notify_ticket_status_update();