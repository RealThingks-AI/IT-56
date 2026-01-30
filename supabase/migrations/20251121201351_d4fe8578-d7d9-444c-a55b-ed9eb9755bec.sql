-- Create helpdesk core tables with multi-tenant support using BIGINT IDs

-- Ticket Categories
CREATE TABLE public.helpdesk_categories (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id BIGINT REFERENCES public.helpdesk_categories(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- SLA Policies
CREATE TABLE public.helpdesk_sla_policies (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  response_time_hours INTEGER NOT NULL,
  resolution_time_hours INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Helpdesk Tickets
CREATE TABLE public.helpdesk_tickets (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id BIGINT REFERENCES public.helpdesk_categories(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'on_hold')),
  requester_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  team TEXT,
  sla_policy_id BIGINT REFERENCES public.helpdesk_sla_policies(id) ON DELETE SET NULL,
  sla_due_date TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE(tenant_id, ticket_number)
);

-- Ticket Comments
CREATE TABLE public.helpdesk_ticket_comments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ticket_id BIGINT NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ticket Attachments
CREATE TABLE public.helpdesk_ticket_attachments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ticket_id BIGINT NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ticket History
CREATE TABLE public.helpdesk_ticket_history (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ticket_id BIGINT NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.helpdesk_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_ticket_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "org_isolation_select_helpdesk_categories" ON public.helpdesk_categories
  FOR SELECT USING (organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "org_isolation_manage_helpdesk_categories" ON public.helpdesk_categories
  FOR ALL USING (organisation_id = get_user_org() AND EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'owner')));

CREATE POLICY "org_isolation_select_sla" ON public.helpdesk_sla_policies
  FOR SELECT USING (organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "org_isolation_manage_sla" ON public.helpdesk_sla_policies
  FOR ALL USING (organisation_id = get_user_org() AND EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'owner')));

CREATE POLICY "org_isolation_select_tickets" ON public.helpdesk_tickets
  FOR SELECT USING (organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "org_isolation_insert_tickets" ON public.helpdesk_tickets
  FOR INSERT WITH CHECK (organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "org_isolation_update_tickets" ON public.helpdesk_tickets
  FOR UPDATE USING (organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "org_isolation_select_comments" ON public.helpdesk_ticket_comments
  FOR SELECT USING (ticket_id IN (SELECT id FROM public.helpdesk_tickets WHERE organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "org_isolation_insert_comments" ON public.helpdesk_ticket_comments
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "org_isolation_select_attachments" ON public.helpdesk_ticket_attachments
  FOR SELECT USING (ticket_id IN (SELECT id FROM public.helpdesk_tickets WHERE organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "org_isolation_insert_attachments" ON public.helpdesk_ticket_attachments
  FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) OR ticket_id IN (SELECT id FROM public.helpdesk_tickets WHERE organisation_id = get_user_org()));

CREATE POLICY "org_isolation_select_history" ON public.helpdesk_ticket_history
  FOR SELECT USING (ticket_id IN (SELECT id FROM public.helpdesk_tickets WHERE organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())));

-- Create indexes
CREATE INDEX idx_helpdesk_tickets_tenant_id ON public.helpdesk_tickets(tenant_id);
CREATE INDEX idx_helpdesk_tickets_organisation_id ON public.helpdesk_tickets(organisation_id);
CREATE INDEX idx_helpdesk_tickets_status ON public.helpdesk_tickets(status);
CREATE INDEX idx_helpdesk_tickets_assignee_id ON public.helpdesk_tickets(assignee_id);
CREATE INDEX idx_helpdesk_tickets_requester_id ON public.helpdesk_tickets(requester_id);
CREATE INDEX idx_helpdesk_ticket_comments_ticket_id ON public.helpdesk_ticket_comments(ticket_id);
CREATE INDEX idx_helpdesk_ticket_attachments_ticket_id ON public.helpdesk_ticket_attachments(ticket_id);
CREATE INDEX idx_helpdesk_ticket_history_ticket_id ON public.helpdesk_ticket_history(ticket_id);

-- Triggers for updated_at
CREATE TRIGGER update_helpdesk_categories_updated_at BEFORE UPDATE ON public.helpdesk_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_helpdesk_sla_policies_updated_at BEFORE UPDATE ON public.helpdesk_sla_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_helpdesk_tickets_updated_at BEFORE UPDATE ON public.helpdesk_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_helpdesk_ticket_comments_updated_at BEFORE UPDATE ON public.helpdesk_ticket_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_helpdesk_ticket_number(p_tenant_id BIGINT, p_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  ticket_num TEXT;
BEGIN
  IF p_org_id IS NOT NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM helpdesk_tickets
    WHERE organisation_id = p_org_id;
  ELSE
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM helpdesk_tickets
    WHERE tenant_id = p_tenant_id;
  END IF;
  
  ticket_num := 'TKT-' || LPAD(next_number::TEXT, 6, '0');
  RETURN ticket_num;
END;
$$;