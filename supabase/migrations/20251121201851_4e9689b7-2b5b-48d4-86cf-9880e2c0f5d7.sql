-- Create SRM (Service Request Management) tables

-- Service Catalog
CREATE TABLE public.srm_catalog (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  form_fields JSONB DEFAULT '[]'::jsonb,
  requires_approval BOOLEAN DEFAULT false,
  auto_assign_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  estimated_delivery_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Service Requests
CREATE TABLE public.srm_requests (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  request_number TEXT NOT NULL,
  catalog_item_id BIGINT NOT NULL REFERENCES public.srm_catalog(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  form_data JSONB DEFAULT '{}'::jsonb,
  additional_notes TEXT,
  approval_required BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, request_number)
);

-- Service Request Approvals
CREATE TABLE public.srm_approvals (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  request_id BIGINT NOT NULL REFERENCES public.srm_requests(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Service Request Comments
CREATE TABLE public.srm_request_comments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  request_id BIGINT NOT NULL REFERENCES public.srm_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.srm_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.srm_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.srm_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.srm_request_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for srm_catalog
CREATE POLICY "org_isolation_select_srm_catalog" ON public.srm_catalog
  FOR SELECT USING (
    (organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
    AND is_active = true
  );

CREATE POLICY "org_isolation_manage_srm_catalog" ON public.srm_catalog
  FOR ALL USING (
    organisation_id = get_user_org() 
    AND EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- RLS Policies for srm_requests
CREATE POLICY "org_isolation_select_srm_requests" ON public.srm_requests
  FOR SELECT USING (
    organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_isolation_insert_srm_requests" ON public.srm_requests
  FOR INSERT WITH CHECK (
    organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_isolation_update_srm_requests" ON public.srm_requests
  FOR UPDATE USING (
    (organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
    AND (assignee_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
         OR requester_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
         OR EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'owner')))
  );

-- RLS Policies for srm_approvals
CREATE POLICY "org_isolation_select_srm_approvals" ON public.srm_approvals
  FOR SELECT USING (
    request_id IN (SELECT id FROM public.srm_requests WHERE organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
  );

CREATE POLICY "org_isolation_manage_srm_approvals" ON public.srm_approvals
  FOR ALL USING (
    approver_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- RLS Policies for srm_request_comments
CREATE POLICY "org_isolation_select_srm_comments" ON public.srm_request_comments
  FOR SELECT USING (
    request_id IN (SELECT id FROM public.srm_requests WHERE organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
  );

CREATE POLICY "org_isolation_insert_srm_comments" ON public.srm_request_comments
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- Create indexes
CREATE INDEX idx_srm_catalog_tenant_id ON public.srm_catalog(tenant_id);
CREATE INDEX idx_srm_catalog_organisation_id ON public.srm_catalog(organisation_id);
CREATE INDEX idx_srm_catalog_category ON public.srm_catalog(category);
CREATE INDEX idx_srm_requests_tenant_id ON public.srm_requests(tenant_id);
CREATE INDEX idx_srm_requests_organisation_id ON public.srm_requests(organisation_id);
CREATE INDEX idx_srm_requests_status ON public.srm_requests(status);
CREATE INDEX idx_srm_requests_requester_id ON public.srm_requests(requester_id);
CREATE INDEX idx_srm_requests_assignee_id ON public.srm_requests(assignee_id);
CREATE INDEX idx_srm_approvals_request_id ON public.srm_approvals(request_id);
CREATE INDEX idx_srm_approvals_approver_id ON public.srm_approvals(approver_id);
CREATE INDEX idx_srm_request_comments_request_id ON public.srm_request_comments(request_id);

-- Triggers for updated_at
CREATE TRIGGER update_srm_catalog_updated_at BEFORE UPDATE ON public.srm_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_srm_requests_updated_at BEFORE UPDATE ON public.srm_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_srm_approvals_updated_at BEFORE UPDATE ON public.srm_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate SRM request numbers
CREATE OR REPLACE FUNCTION generate_srm_request_number(p_tenant_id BIGINT, p_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  request_num TEXT;
BEGIN
  IF p_org_id IS NOT NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM srm_requests
    WHERE organisation_id = p_org_id;
  ELSE
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM srm_requests
    WHERE tenant_id = p_tenant_id;
  END IF;
  
  request_num := 'SRM-' || LPAD(next_number::TEXT, 6, '0');
  RETURN request_num;
END;
$$;