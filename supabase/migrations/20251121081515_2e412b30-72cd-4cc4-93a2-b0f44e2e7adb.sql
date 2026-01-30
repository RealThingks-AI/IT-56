-- Create tools table
CREATE TABLE IF NOT EXISTS public.tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_tools table for tool assignments
CREATE TABLE IF NOT EXISTS public.user_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tool_id)
);

-- Create invoice_items table for billing
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT REFERENCES public.tenants(id),
  organisation_id UUID REFERENCES public.organisations(id),
  tool_id UUID REFERENCES public.tools(id),
  amount NUMERIC NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tools
CREATE POLICY "All authenticated users can view active tools"
  ON public.tools FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Super admins can manage tools"
  ON public.tools FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- RLS Policies for user_tools
CREATE POLICY "Users can view their own tool assignments"
  ON public.user_tools FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Org admins can view tools in their org"
  ON public.user_tools FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE organisation_id = get_user_org()
    )
  );

CREATE POLICY "Org admins can assign tools"
  ON public.user_tools FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin', 'owner')
      AND u.organisation_id = get_user_org()
    )
  );

CREATE POLICY "Org admins can remove tool assignments"
  ON public.user_tools FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin', 'owner')
      AND u.organisation_id = get_user_org()
    )
  );

-- RLS Policies for invoice_items
CREATE POLICY "Org users can view their org invoices"
  ON public.invoice_items FOR SELECT
  TO authenticated
  USING (organisation_id = get_user_org());

CREATE POLICY "Org admins can manage invoices"
  ON public.invoice_items FOR ALL
  TO authenticated
  USING (
    organisation_id = get_user_org() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Super admins can manage all invoices"
  ON public.invoice_items FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Insert default tools
INSERT INTO public.tools (key, name, description, price, active) VALUES
  ('crm', 'CRM', 'Customer Relationship Management', 999, true),
  ('inventory', 'Inventory', 'Inventory Management System', 799, true),
  ('assets', 'Assets', 'Asset Tracking & Depreciation', 599, true),
  ('invoicing', 'Invoicing', 'Invoice Generation & Management', 699, true),
  ('attendance', 'Attendance', 'Employee Attendance Tracking', 499, true),
  ('recruitment', 'Recruitment', 'Recruitment & Hiring Management', 899, true),
  ('tickets', 'Tickets', 'Support Ticket System', 599, true),
  ('marketing', 'Marketing', 'Marketing Campaign Management', 799, true)
ON CONFLICT (key) DO NOTHING;

-- Create function to check tool access (fixed for individual users)
CREATE OR REPLACE FUNCTION public.user_has_tool_access(user_auth_id UUID, tool_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_tools ut
    JOIN tools t ON ut.tool_id = t.id
    JOIN users u ON ut.user_id = u.id
    WHERE u.auth_user_id = user_auth_id
    AND t.key = tool_key
    AND t.active = true
  ) OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = user_auth_id
    AND u.user_type = 'individual'::user_type
  );
$$;

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tools_updated_at
  BEFORE UPDATE ON public.tools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add audit log entry for tool assignments
CREATE OR REPLACE FUNCTION log_tool_assignment()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_tool_assignments
  AFTER INSERT OR DELETE ON public.user_tools
  FOR EACH ROW
  EXECUTE FUNCTION log_tool_assignment();