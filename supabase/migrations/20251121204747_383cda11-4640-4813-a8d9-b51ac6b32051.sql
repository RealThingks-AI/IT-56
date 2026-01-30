-- Knowledge Base Tables
CREATE TABLE IF NOT EXISTS public.helpdesk_kb_categories (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id BIGINT REFERENCES helpdesk_kb_categories(id) ON DELETE SET NULL,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.helpdesk_kb_articles (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES helpdesk_kb_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  views_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  tags TEXT[],
  attachments JSONB DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.helpdesk_kb_article_feedback (
  id BIGSERIAL PRIMARY KEY,
  article_id BIGINT NOT NULL REFERENCES helpdesk_kb_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_helpful BOOLEAN NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Problem Management Tables
CREATE TABLE IF NOT EXISTS public.helpdesk_problems (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  problem_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'known_error')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  root_cause TEXT,
  workaround TEXT,
  solution TEXT,
  category_id BIGINT REFERENCES helpdesk_categories(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.helpdesk_problem_tickets (
  id BIGSERIAL PRIMARY KEY,
  problem_id BIGINT NOT NULL REFERENCES helpdesk_problems(id) ON DELETE CASCADE,
  ticket_id BIGINT NOT NULL REFERENCES helpdesk_tickets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(problem_id, ticket_id)
);

-- Change Management Tables
CREATE TABLE IF NOT EXISTS public.helpdesk_changes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  change_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT DEFAULT 'standard' CHECK (type IN ('standard', 'normal', 'emergency')),
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'scheduled', 'in_progress', 'completed', 'cancelled', 'failed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  category_id BIGINT REFERENCES helpdesk_categories(id) ON DELETE SET NULL,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  impact TEXT,
  rollback_plan TEXT,
  implementation_plan TEXT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  requires_approval BOOLEAN DEFAULT true,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.helpdesk_change_approvals (
  id BIGSERIAL PRIMARY KEY,
  change_id BIGINT NOT NULL REFERENCES helpdesk_changes(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Automation Tables
CREATE TABLE IF NOT EXISTS public.helpdesk_automation_rules (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('ticket_created', 'ticket_updated', 'status_changed', 'priority_changed', 'assigned', 'commented', 'time_based')),
  is_active BOOLEAN DEFAULT true,
  execution_order INTEGER DEFAULT 0,
  conditions JSONB DEFAULT '[]'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  last_executed_at TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.helpdesk_automation_logs (
  id BIGSERIAL PRIMARY KEY,
  rule_id BIGINT NOT NULL REFERENCES helpdesk_automation_rules(id) ON DELETE CASCADE,
  ticket_id BIGINT REFERENCES helpdesk_tickets(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped')),
  trigger_data JSONB,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT now()
);

-- Queue Management Tables
CREATE TABLE IF NOT EXISTS public.helpdesk_queues (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  email_address TEXT,
  auto_assign BOOLEAN DEFAULT false,
  assignment_method TEXT DEFAULT 'round_robin' CHECK (assignment_method IN ('round_robin', 'load_balanced', 'manual')),
  sla_policy_id BIGINT REFERENCES helpdesk_sla_policies(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.helpdesk_queue_members (
  id BIGSERIAL PRIMARY KEY,
  queue_id BIGINT NOT NULL REFERENCES helpdesk_queues(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  max_concurrent_tickets INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(queue_id, agent_id)
);

-- Add queue_id to tickets table
ALTER TABLE public.helpdesk_tickets 
ADD COLUMN IF NOT EXISTS queue_id BIGINT REFERENCES helpdesk_queues(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON helpdesk_kb_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_status ON helpdesk_kb_articles(status);
CREATE INDEX IF NOT EXISTS idx_kb_articles_author ON helpdesk_kb_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_published ON helpdesk_kb_articles(published_at) WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_problems_status ON helpdesk_problems(status);
CREATE INDEX IF NOT EXISTS idx_problems_priority ON helpdesk_problems(priority);
CREATE INDEX IF NOT EXISTS idx_problems_assigned ON helpdesk_problems(assigned_to);
CREATE INDEX IF NOT EXISTS idx_problem_tickets_problem ON helpdesk_problem_tickets(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_tickets_ticket ON helpdesk_problem_tickets(ticket_id);

CREATE INDEX IF NOT EXISTS idx_changes_status ON helpdesk_changes(status);
CREATE INDEX IF NOT EXISTS idx_changes_scheduled ON helpdesk_changes(scheduled_start, scheduled_end);
CREATE INDEX IF NOT EXISTS idx_changes_assigned ON helpdesk_changes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_change_approvals_change ON helpdesk_change_approvals(change_id);
CREATE INDEX IF NOT EXISTS idx_change_approvals_approver ON helpdesk_change_approvals(approver_id);

CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON helpdesk_automation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON helpdesk_automation_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule ON helpdesk_automation_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_ticket ON helpdesk_automation_logs(ticket_id);

CREATE INDEX IF NOT EXISTS idx_queues_active ON helpdesk_queues(is_active);
CREATE INDEX IF NOT EXISTS idx_queue_members_queue ON helpdesk_queue_members(queue_id);
CREATE INDEX IF NOT EXISTS idx_queue_members_agent ON helpdesk_queue_members(agent_id);
CREATE INDEX IF NOT EXISTS idx_tickets_queue ON helpdesk_tickets(queue_id);

-- Enable RLS
ALTER TABLE public.helpdesk_kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_kb_article_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_problem_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_change_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_queue_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Knowledge Base
CREATE POLICY "org_isolation_select_kb_categories" ON helpdesk_kb_categories
  FOR SELECT USING (
    organisation_id = get_user_org() OR 
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_isolation_manage_kb_categories" ON helpdesk_kb_categories
  FOR ALL USING (
    (organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
    AND EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "org_isolation_select_kb_articles" ON helpdesk_kb_articles
  FOR SELECT USING (
    (status = 'published') OR
    (organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "org_isolation_manage_kb_articles" ON helpdesk_kb_articles
  FOR ALL USING (
    (organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
    AND EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'owner', 'editor'))
  );

CREATE POLICY "users_can_give_feedback" ON helpdesk_kb_article_feedback
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_can_view_feedback" ON helpdesk_kb_article_feedback
  FOR SELECT USING (true);

-- RLS Policies for Problems
CREATE POLICY "org_isolation_select_problems" ON helpdesk_problems
  FOR SELECT USING (
    organisation_id = get_user_org() OR 
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_isolation_manage_problems" ON helpdesk_problems
  FOR ALL USING (
    organisation_id = get_user_org() OR 
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_isolation_problem_tickets" ON helpdesk_problem_tickets
  FOR ALL USING (
    problem_id IN (SELECT id FROM helpdesk_problems WHERE 
      organisation_id = get_user_org() OR 
      tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

-- RLS Policies for Changes
CREATE POLICY "org_isolation_select_changes" ON helpdesk_changes
  FOR SELECT USING (
    organisation_id = get_user_org() OR 
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_isolation_manage_changes" ON helpdesk_changes
  FOR ALL USING (
    organisation_id = get_user_org() OR 
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_isolation_change_approvals" ON helpdesk_change_approvals
  FOR ALL USING (
    change_id IN (SELECT id FROM helpdesk_changes WHERE 
      organisation_id = get_user_org() OR 
      tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

-- RLS Policies for Automation
CREATE POLICY "org_isolation_select_automation_rules" ON helpdesk_automation_rules
  FOR SELECT USING (
    organisation_id = get_user_org() OR 
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_isolation_manage_automation_rules" ON helpdesk_automation_rules
  FOR ALL USING (
    (organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
    AND EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "org_isolation_automation_logs" ON helpdesk_automation_logs
  FOR SELECT USING (
    rule_id IN (SELECT id FROM helpdesk_automation_rules WHERE 
      organisation_id = get_user_org() OR 
      tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

-- RLS Policies for Queues
CREATE POLICY "org_isolation_select_queues" ON helpdesk_queues
  FOR SELECT USING (
    organisation_id = get_user_org() OR 
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_isolation_manage_queues" ON helpdesk_queues
  FOR ALL USING (
    (organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
    AND EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "org_isolation_queue_members" ON helpdesk_queue_members
  FOR ALL USING (
    queue_id IN (SELECT id FROM helpdesk_queues WHERE 
      organisation_id = get_user_org() OR 
      tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Functions for generating numbers
CREATE OR REPLACE FUNCTION generate_problem_number(p_tenant_id BIGINT, p_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  problem_num TEXT;
BEGIN
  IF p_org_id IS NOT NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(problem_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM helpdesk_problems
    WHERE organisation_id = p_org_id;
  ELSE
    SELECT COALESCE(MAX(CAST(SUBSTRING(problem_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM helpdesk_problems
    WHERE tenant_id = p_tenant_id;
  END IF;
  
  problem_num := 'PRB-' || LPAD(next_number::TEXT, 6, '0');
  RETURN problem_num;
END;
$$;

CREATE OR REPLACE FUNCTION generate_change_number(p_tenant_id BIGINT, p_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  change_num TEXT;
BEGIN
  IF p_org_id IS NOT NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(change_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM helpdesk_changes
    WHERE organisation_id = p_org_id;
  ELSE
    SELECT COALESCE(MAX(CAST(SUBSTRING(change_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM helpdesk_changes
    WHERE tenant_id = p_tenant_id;
  END IF;
  
  change_num := 'CHG-' || LPAD(next_number::TEXT, 6, '0');
  RETURN change_num;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_kb_categories_updated_at BEFORE UPDATE ON helpdesk_kb_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_articles_updated_at BEFORE UPDATE ON helpdesk_kb_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_problems_updated_at BEFORE UPDATE ON helpdesk_problems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_changes_updated_at BEFORE UPDATE ON helpdesk_changes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON helpdesk_automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_queues_updated_at BEFORE UPDATE ON helpdesk_queues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();