-- Service Request Management Module - Fixed Type Mismatches

-- Add organisation_id to srm_requests if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'srm_requests' AND column_name = 'organisation_id') THEN
    ALTER TABLE public.srm_requests ADD COLUMN organisation_id UUID;
  END IF;
END $$;

-- SRM Approvals Table
CREATE TABLE IF NOT EXISTS public.srm_request_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL DEFAULT 1,
  request_id BIGINT NOT NULL,
  approver_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  comments TEXT,
  step_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SRM Request Comments Table
CREATE TABLE IF NOT EXISTS public.srm_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL DEFAULT 1,
  request_id BIGINT NOT NULL,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SRM SLA Policies Table
CREATE TABLE IF NOT EXISTS public.srm_sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  priority TEXT NOT NULL,
  response_time_minutes INTEGER NOT NULL,
  fulfillment_time_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Change Requests Table
CREATE TABLE IF NOT EXISTS public.change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL DEFAULT 1,
  change_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact TEXT,
  risk TEXT DEFAULT 'low',
  implementation_plan TEXT,
  backout_plan TEXT,
  status TEXT DEFAULT 'draft',
  change_calendar_date TIMESTAMPTZ,
  linked_request_id BIGINT,
  attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  is_deleted BOOLEAN DEFAULT false
);

-- Change Approvals Table
CREATE TABLE IF NOT EXISTS public.change_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL DEFAULT 1,
  change_id UUID NOT NULL,
  approver_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  comments TEXT,
  step_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Change Calendar Table  
CREATE TABLE IF NOT EXISTS public.change_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL DEFAULT 1,
  change_id UUID NOT NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Assignment Rules Table
CREATE TABLE IF NOT EXISTS public.srm_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  conditions JSONB DEFAULT '{}'::jsonb,
  assign_to UUID,
  assign_to_queue TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.srm_request_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.srm_request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.srm_sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.srm_assignment_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for srm_request_approvals
DROP POLICY IF EXISTS "Users can view their approvals" ON public.srm_request_approvals;
CREATE POLICY "Users can view their approvals" ON public.srm_request_approvals
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Approvers can update their approvals" ON public.srm_request_approvals;
CREATE POLICY "Approvers can update their approvals" ON public.srm_request_approvals
  FOR UPDATE USING (
    approver_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "System can insert approvals" ON public.srm_request_approvals;
CREATE POLICY "System can insert approvals" ON public.srm_request_approvals
  FOR INSERT WITH CHECK (true);

-- RLS Policies for srm_request_comments
DROP POLICY IF EXISTS "Users can view request comments" ON public.srm_request_comments;
CREATE POLICY "Users can view request comments" ON public.srm_request_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can add comments" ON public.srm_request_comments;
CREATE POLICY "Users can add comments" ON public.srm_request_comments
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- RLS Policies for srm_sla_policies
DROP POLICY IF EXISTS "Users can view SLA policies" ON public.srm_sla_policies;
CREATE POLICY "Users can view SLA policies" ON public.srm_sla_policies
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage SLA policies" ON public.srm_sla_policies;
CREATE POLICY "Admins can manage SLA policies" ON public.srm_sla_policies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- RLS Policies for change_requests
DROP POLICY IF EXISTS "Users can view change requests" ON public.change_requests;
CREATE POLICY "Users can view change requests" ON public.change_requests
  FOR SELECT USING (is_deleted = false);

DROP POLICY IF EXISTS "Users can create change requests" ON public.change_requests;
CREATE POLICY "Users can create change requests" ON public.change_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their change requests" ON public.change_requests;
CREATE POLICY "Users can update their change requests" ON public.change_requests
  FOR UPDATE USING (
    is_deleted = false AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'owner'))
    )
  );

-- RLS Policies for change_approvals
DROP POLICY IF EXISTS "Users can view change approvals" ON public.change_approvals;
CREATE POLICY "Users can view change approvals" ON public.change_approvals
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Approvers can update change approvals" ON public.change_approvals;
CREATE POLICY "Approvers can update change approvals" ON public.change_approvals
  FOR UPDATE USING (
    approver_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "System can insert change approvals" ON public.change_approvals;
CREATE POLICY "System can insert change approvals" ON public.change_approvals
  FOR INSERT WITH CHECK (true);

-- RLS Policies for change_calendar
DROP POLICY IF EXISTS "Users can view change calendar" ON public.change_calendar;
CREATE POLICY "Users can view change calendar" ON public.change_calendar
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage change calendar" ON public.change_calendar;
CREATE POLICY "Admins can manage change calendar" ON public.change_calendar
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- RLS Policies for srm_assignment_rules
DROP POLICY IF EXISTS "Users can view assignment rules" ON public.srm_assignment_rules;
CREATE POLICY "Users can view assignment rules" ON public.srm_assignment_rules
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage assignment rules" ON public.srm_assignment_rules;
CREATE POLICY "Admins can manage assignment rules" ON public.srm_assignment_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- Function to generate change request number
CREATE OR REPLACE FUNCTION generate_change_request_number(p_tenant_id BIGINT)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  change_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(change_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM change_requests
  WHERE tenant_id = p_tenant_id;
  
  change_num := 'CHR-' || LPAD(next_number::TEXT, 6, '0');
  RETURN change_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_srm_request_approvals_request ON public.srm_request_approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_srm_request_approvals_approver ON public.srm_request_approvals(approver_id, status);
CREATE INDEX IF NOT EXISTS idx_srm_request_comments_request ON public.srm_request_comments(request_id);
CREATE INDEX IF NOT EXISTS idx_srm_sla_policies_tenant ON public.srm_sla_policies(tenant_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_change_requests_tenant ON public.change_requests(tenant_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_change_approvals_change ON public.change_approvals(change_id);
CREATE INDEX IF NOT EXISTS idx_change_calendar_dates ON public.change_calendar(scheduled_start, scheduled_end);
CREATE INDEX IF NOT EXISTS idx_srm_assignment_rules_tenant ON public.srm_assignment_rules(tenant_id) WHERE is_active = true;