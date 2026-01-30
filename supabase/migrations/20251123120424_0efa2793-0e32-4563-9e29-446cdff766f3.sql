-- Enable triggers for helpdesk ticket automation

-- Trigger to auto-set SLA due date on ticket creation
CREATE TRIGGER set_ticket_sla_due_date
  BEFORE INSERT ON helpdesk_tickets
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_sla_due_date();

-- Trigger to log ticket changes to history
CREATE TRIGGER log_ticket_changes_trigger
  AFTER UPDATE ON helpdesk_tickets
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_changes();

-- Trigger to send notifications on ticket status updates
CREATE TRIGGER notify_ticket_status_change
  AFTER UPDATE ON helpdesk_tickets
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_ticket_status_update();

-- Trigger to send notifications on ticket creation
CREATE TRIGGER notify_new_ticket
  AFTER INSERT ON helpdesk_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_created();

-- Create a scheduled job function for SLA breach checking
-- This would typically run via pg_cron or external scheduler
CREATE OR REPLACE FUNCTION check_and_flag_sla_breaches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark tickets as SLA breached if due date has passed and not resolved
  UPDATE helpdesk_tickets
  SET sla_breached = TRUE,
      updated_at = NOW()
  WHERE sla_due_date < NOW()
    AND status NOT IN ('resolved', 'closed')
    AND sla_breached = FALSE
    AND is_deleted = FALSE;
END;
$$;

COMMENT ON FUNCTION check_and_flag_sla_breaches() IS 'Checks for SLA breaches and flags tickets. Should be run periodically via scheduler.';