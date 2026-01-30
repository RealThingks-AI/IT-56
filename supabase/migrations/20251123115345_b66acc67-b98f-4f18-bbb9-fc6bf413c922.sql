-- Ensure all required fields exist on helpdesk_tickets table
ALTER TABLE helpdesk_tickets 
ADD COLUMN IF NOT EXISTS team TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS resolution_comments TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Ensure proper indexes on helpdesk_tickets
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_tenant_id ON helpdesk_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_organisation_id ON helpdesk_tickets(organisation_id);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_status ON helpdesk_tickets(status);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_priority ON helpdesk_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_assignee_id ON helpdesk_tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_requester_id ON helpdesk_tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_created_at ON helpdesk_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_is_deleted ON helpdesk_tickets(is_deleted) WHERE is_deleted = FALSE;

-- Ensure ticket_comments has proper structure
ALTER TABLE helpdesk_ticket_comments
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Ensure ticket_history has proper structure  
ALTER TABLE helpdesk_ticket_history
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure ticket_attachments has proper structure
ALTER TABLE helpdesk_ticket_attachments
ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure helpdesk_categories has proper structure
ALTER TABLE helpdesk_categories
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Ensure helpdesk_sla_policies has proper structure
ALTER TABLE helpdesk_sla_policies
ADD COLUMN IF NOT EXISTS response_time_minutes INTEGER,
ADD COLUMN IF NOT EXISTS resolution_time_minutes INTEGER,
ADD COLUMN IF NOT EXISTS escalation_rule JSONB DEFAULT '{}'::jsonb;

-- Update existing time columns if they're in hours
DO $$
BEGIN
  -- Check if response_time_hours exists, convert to minutes
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'helpdesk_sla_policies' 
             AND column_name = 'response_time_hours') THEN
    UPDATE helpdesk_sla_policies 
    SET response_time_minutes = response_time_hours * 60
    WHERE response_time_minutes IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'helpdesk_sla_policies' 
             AND column_name = 'resolution_time_hours') THEN
    UPDATE helpdesk_sla_policies 
    SET resolution_time_minutes = resolution_time_hours * 60
    WHERE resolution_time_minutes IS NULL;
  END IF;
END $$;

-- Ensure helpdesk_problems has proper structure
ALTER TABLE helpdesk_problems
ADD COLUMN IF NOT EXISTS problem_title TEXT,
ADD COLUMN IF NOT EXISTS linked_ticket_ids UUID[],
ADD COLUMN IF NOT EXISTS permanent_fix TEXT,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Create function to handle soft deletes
CREATE OR REPLACE FUNCTION soft_delete_ticket(ticket_id_param INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE helpdesk_tickets
  SET is_deleted = TRUE,
      updated_at = NOW(),
      updated_by = auth.uid()
  WHERE id = ticket_id_param;
END;
$$;

-- Create function to calculate SLA due date
CREATE OR REPLACE FUNCTION calculate_sla_due_date(
  ticket_priority TEXT,
  org_id UUID DEFAULT NULL,
  tenant_id_param BIGINT DEFAULT NULL
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolution_minutes INTEGER;
  due_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the resolution time from SLA policy
  SELECT resolution_time_minutes INTO resolution_minutes
  FROM helpdesk_sla_policies
  WHERE priority = ticket_priority
    AND is_active = TRUE
    AND (organisation_id = org_id OR tenant_id = tenant_id_param)
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no SLA policy found, use defaults
  IF resolution_minutes IS NULL THEN
    resolution_minutes := CASE ticket_priority
      WHEN 'urgent' THEN 240    -- 4 hours
      WHEN 'high' THEN 480      -- 8 hours
      WHEN 'medium' THEN 1440   -- 24 hours
      WHEN 'low' THEN 2880      -- 48 hours
      ELSE 1440
    END;
  END IF;
  
  -- Calculate due date
  due_date := NOW() + (resolution_minutes || ' minutes')::INTERVAL;
  
  RETURN due_date;
END;
$$;

-- Create trigger to auto-calculate SLA due date on ticket insert
CREATE OR REPLACE FUNCTION auto_set_sla_due_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only set if not already set
  IF NEW.sla_due_date IS NULL THEN
    NEW.sla_due_date := calculate_sla_due_date(
      NEW.priority,
      NEW.organisation_id,
      NEW.tenant_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_sla_due_date ON helpdesk_tickets;
CREATE TRIGGER trigger_auto_sla_due_date
BEFORE INSERT ON helpdesk_tickets
FOR EACH ROW
EXECUTE FUNCTION auto_set_sla_due_date();

-- Create trigger to log ticket history on updates
CREATE OR REPLACE FUNCTION log_ticket_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_field TEXT;
BEGIN
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Check if the column is called 'action' or 'field_name'
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'helpdesk_ticket_history' 
               AND column_name = 'action') THEN
      INSERT INTO helpdesk_ticket_history (
        ticket_id, tenant_id, action, old_value, new_value, user_id
      ) VALUES (
        NEW.id, NEW.tenant_id, 'status_changed', OLD.status, NEW.status, auth.uid()
      );
    ELSE
      INSERT INTO helpdesk_ticket_history (
        ticket_id, tenant_id, field_name, old_value, new_value, user_id
      ) VALUES (
        NEW.id, NEW.tenant_id, 'status', OLD.status, NEW.status, auth.uid()
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
        NEW.id, NEW.tenant_id, 'priority_changed', OLD.priority, NEW.priority, auth.uid()
      );
    ELSE
      INSERT INTO helpdesk_ticket_history (
        ticket_id, tenant_id, field_name, old_value, new_value, user_id
      ) VALUES (
        NEW.id, NEW.tenant_id, 'priority', OLD.priority, NEW.priority, auth.uid()
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
        OLD.assignee_id::TEXT, NEW.assignee_id::TEXT, auth.uid()
      );
    ELSE
      INSERT INTO helpdesk_ticket_history (
        ticket_id, tenant_id, field_name, old_value, new_value, user_id
      ) VALUES (
        NEW.id, NEW.tenant_id, 'assignee', 
        OLD.assignee_id::TEXT, NEW.assignee_id::TEXT, auth.uid()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_ticket_changes ON helpdesk_tickets;
CREATE TRIGGER trigger_log_ticket_changes
AFTER UPDATE ON helpdesk_tickets
FOR EACH ROW
EXECUTE FUNCTION log_ticket_changes();

-- Create function to check SLA breaches
CREATE OR REPLACE FUNCTION check_sla_breach()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark tickets as SLA breached if due date has passed and not resolved
  UPDATE helpdesk_tickets
  SET sla_breached = TRUE
  WHERE sla_due_date < NOW()
    AND status NOT IN ('resolved', 'closed')
    AND sla_breached = FALSE
    AND is_deleted = FALSE;
END;
$$;

-- Update RLS policies to exclude soft-deleted records
DROP POLICY IF EXISTS "org_isolation_select_tickets" ON helpdesk_tickets;
CREATE POLICY "org_isolation_select_tickets"
ON helpdesk_tickets
FOR SELECT
USING (
  is_deleted = FALSE 
  AND (
    (organisation_id = get_user_org()) 
    OR (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  )
);

DROP POLICY IF EXISTS "org_isolation_insert_tickets" ON helpdesk_tickets;
CREATE POLICY "org_isolation_insert_tickets"
ON helpdesk_tickets
FOR INSERT
WITH CHECK (
  (organisation_id = get_user_org()) 
  OR (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
);

DROP POLICY IF EXISTS "org_isolation_update_tickets" ON helpdesk_tickets;
CREATE POLICY "org_isolation_update_tickets"
ON helpdesk_tickets
FOR UPDATE
USING (
  is_deleted = FALSE 
  AND (
    (organisation_id = get_user_org()) 
    OR (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  )
);

-- Soft delete policy (only set is_deleted flag, no hard deletes)
DROP POLICY IF EXISTS "org_isolation_delete_tickets" ON helpdesk_tickets;
CREATE POLICY "org_isolation_soft_delete_tickets"
ON helpdesk_tickets
FOR UPDATE
USING (
  (organisation_id = get_user_org()) 
  OR (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
)
WITH CHECK (
  is_deleted = TRUE
);

-- Update RLS for ticket_comments
DROP POLICY IF EXISTS "org_isolation_select_comments" ON helpdesk_ticket_comments;
CREATE POLICY "org_isolation_select_comments"
ON helpdesk_ticket_comments
FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM helpdesk_tickets 
    WHERE is_deleted = FALSE 
    AND (
      (organisation_id = get_user_org()) 
      OR (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
    )
  )
);

-- Update RLS for ticket_history
DROP POLICY IF EXISTS "org_isolation_select_history" ON helpdesk_ticket_history;
CREATE POLICY "org_isolation_select_history"
ON helpdesk_ticket_history
FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM helpdesk_tickets 
    WHERE is_deleted = FALSE 
    AND (
      (organisation_id = get_user_org()) 
      OR (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
    )
  )
);

-- Update RLS for problems to exclude soft-deleted
DROP POLICY IF EXISTS "org_isolation_select_problems" ON helpdesk_problems;
CREATE POLICY "org_isolation_select_problems"
ON helpdesk_problems
FOR SELECT
USING (
  is_deleted = FALSE 
  AND (
    (organisation_id = get_user_org()) 
    OR (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  )
);

DROP POLICY IF EXISTS "org_isolation_manage_problems" ON helpdesk_problems;
CREATE POLICY "org_isolation_update_problems"
ON helpdesk_problems
FOR UPDATE
USING (
  is_deleted = FALSE 
  AND (
    (organisation_id = get_user_org()) 
    OR (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  )
);

-- Update RLS for categories to exclude soft-deleted
DROP POLICY IF EXISTS "org_isolation_select_helpdesk_categories" ON helpdesk_categories;
CREATE POLICY "org_isolation_select_categories"
ON helpdesk_categories
FOR SELECT
USING (
  is_active = TRUE 
  AND is_deleted = FALSE 
  AND (
    (organisation_id = get_user_org()) 
    OR (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  )
);