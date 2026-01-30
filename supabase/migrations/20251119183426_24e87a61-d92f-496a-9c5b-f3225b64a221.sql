-- Create subscriptions_vendors table
CREATE TABLE IF NOT EXISTS public.subscriptions_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  website TEXT,
  address JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create subscriptions_tools table
CREATE TABLE IF NOT EXISTS public.subscriptions_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('SaaS', 'Desktop Software', 'Cloud Service', 'Security Tool', 'Other')),
  vendor_id UUID REFERENCES public.subscriptions_vendors(id) ON DELETE SET NULL,
  subscription_type TEXT CHECK (subscription_type IN ('monthly', 'yearly', 'one_time', 'per_user', 'per_device')),
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  next_billing_date DATE,
  renewal_date DATE,
  billing_cycle_months INTEGER DEFAULT 1,
  auto_renew BOOLEAN DEFAULT false,
  license_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'trial', 'cancelled')),
  department_id UUID,
  notes TEXT,
  contract_file_id UUID,
  invoice_folder_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create subscriptions_licenses table
CREATE TABLE IF NOT EXISTS public.subscriptions_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.subscriptions_tools(id) ON DELETE CASCADE,
  license_key TEXT,
  assigned_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to_device_id UUID,
  assigned_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'available' CHECK (status IN ('assigned', 'available', 'expired', 'revoked')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create subscriptions_payments table
CREATE TABLE IF NOT EXISTS public.subscriptions_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.subscriptions_tools(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  payment_date DATE,
  payment_method TEXT,
  invoice_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('paid', 'failed', 'pending')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create subscriptions_reminders table
CREATE TABLE IF NOT EXISTS public.subscriptions_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.subscriptions_tools(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  reminder_type TEXT CHECK (reminder_type IN ('email', 'sms', 'push', 'teams')),
  message TEXT NOT NULL,
  triggered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.subscriptions_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions_vendors
CREATE POLICY "Users can view vendors in their org"
  ON public.subscriptions_vendors FOR SELECT
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can insert vendors in their org"
  ON public.subscriptions_vendors FOR INSERT
  WITH CHECK (organisation_id = get_user_org());

CREATE POLICY "Users can update vendors in their org"
  ON public.subscriptions_vendors FOR UPDATE
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can delete vendors in their org"
  ON public.subscriptions_vendors FOR DELETE
  USING (organisation_id = get_user_org());

-- RLS Policies for subscriptions_tools
CREATE POLICY "Users can view tools in their org"
  ON public.subscriptions_tools FOR SELECT
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can insert tools in their org"
  ON public.subscriptions_tools FOR INSERT
  WITH CHECK (organisation_id = get_user_org());

CREATE POLICY "Users can update tools in their org"
  ON public.subscriptions_tools FOR UPDATE
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can delete tools in their org"
  ON public.subscriptions_tools FOR DELETE
  USING (organisation_id = get_user_org());

-- RLS Policies for subscriptions_licenses
CREATE POLICY "Users can view licenses in their org"
  ON public.subscriptions_licenses FOR SELECT
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can insert licenses in their org"
  ON public.subscriptions_licenses FOR INSERT
  WITH CHECK (organisation_id = get_user_org());

CREATE POLICY "Users can update licenses in their org"
  ON public.subscriptions_licenses FOR UPDATE
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can delete licenses in their org"
  ON public.subscriptions_licenses FOR DELETE
  USING (organisation_id = get_user_org());

-- RLS Policies for subscriptions_payments
CREATE POLICY "Users can view payments in their org"
  ON public.subscriptions_payments FOR SELECT
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can insert payments in their org"
  ON public.subscriptions_payments FOR INSERT
  WITH CHECK (organisation_id = get_user_org());

CREATE POLICY "Users can update payments in their org"
  ON public.subscriptions_payments FOR UPDATE
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can delete payments in their org"
  ON public.subscriptions_payments FOR DELETE
  USING (organisation_id = get_user_org());

-- RLS Policies for subscriptions_reminders
CREATE POLICY "Users can view reminders in their org"
  ON public.subscriptions_reminders FOR SELECT
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can insert reminders in their org"
  ON public.subscriptions_reminders FOR INSERT
  WITH CHECK (organisation_id = get_user_org());

CREATE POLICY "Users can update reminders in their org"
  ON public.subscriptions_reminders FOR UPDATE
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can delete reminders in their org"
  ON public.subscriptions_reminders FOR DELETE
  USING (organisation_id = get_user_org());

-- Create indexes for performance
CREATE INDEX idx_subscriptions_vendors_org ON public.subscriptions_vendors(organisation_id);
CREATE INDEX idx_subscriptions_tools_org ON public.subscriptions_tools(organisation_id);
CREATE INDEX idx_subscriptions_tools_vendor ON public.subscriptions_tools(vendor_id);
CREATE INDEX idx_subscriptions_tools_status ON public.subscriptions_tools(status);
CREATE INDEX idx_subscriptions_tools_renewal ON public.subscriptions_tools(renewal_date);
CREATE INDEX idx_subscriptions_licenses_org ON public.subscriptions_licenses(organisation_id);
CREATE INDEX idx_subscriptions_licenses_tool ON public.subscriptions_licenses(tool_id);
CREATE INDEX idx_subscriptions_licenses_user ON public.subscriptions_licenses(assigned_to_user_id);
CREATE INDEX idx_subscriptions_payments_org ON public.subscriptions_payments(organisation_id);
CREATE INDEX idx_subscriptions_payments_tool ON public.subscriptions_payments(tool_id);
CREATE INDEX idx_subscriptions_reminders_org ON public.subscriptions_reminders(organisation_id);
CREATE INDEX idx_subscriptions_reminders_tool ON public.subscriptions_reminders(tool_id);
CREATE INDEX idx_subscriptions_reminders_date ON public.subscriptions_reminders(reminder_date, triggered);

-- Triggers for updated_at
CREATE TRIGGER update_subscriptions_vendors_updated_at
  BEFORE UPDATE ON public.subscriptions_vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_tools_updated_at
  BEFORE UPDATE ON public.subscriptions_tools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_licenses_updated_at
  BEFORE UPDATE ON public.subscriptions_licenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_payments_updated_at
  BEFORE UPDATE ON public.subscriptions_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate monthly burn rate
CREATE OR REPLACE FUNCTION get_monthly_burn_rate(org_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  monthly_total NUMERIC := 0;
  yearly_total NUMERIC := 0;
  per_user_total NUMERIC := 0;
BEGIN
  -- Sum monthly subscriptions
  SELECT COALESCE(SUM(cost), 0) INTO monthly_total
  FROM subscriptions_tools
  WHERE organisation_id = org_id
    AND status = 'active'
    AND subscription_type = 'monthly';
  
  -- Sum yearly subscriptions (divided by 12)
  SELECT COALESCE(SUM(cost / 12), 0) INTO yearly_total
  FROM subscriptions_tools
  WHERE organisation_id = org_id
    AND status = 'active'
    AND subscription_type = 'yearly';
  
  -- Sum per-user subscriptions
  SELECT COALESCE(SUM(t.cost * COUNT(l.id)), 0) INTO per_user_total
  FROM subscriptions_tools t
  LEFT JOIN subscriptions_licenses l ON l.tool_id = t.id AND l.status = 'assigned'
  WHERE t.organisation_id = org_id
    AND t.status = 'active'
    AND t.subscription_type = 'per_user'
  GROUP BY t.id;
  
  RETURN monthly_total + yearly_total + per_user_total;
END;
$$;

-- Function to get upcoming renewals
CREATE OR REPLACE FUNCTION get_upcoming_renewals(org_id UUID, days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (
  tool_id UUID,
  tool_name TEXT,
  renewal_date DATE,
  days_until_renewal INTEGER,
  cost NUMERIC,
  vendor_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.tool_name,
    t.renewal_date,
    (t.renewal_date - CURRENT_DATE)::INTEGER,
    t.cost,
    v.vendor_name
  FROM subscriptions_tools t
  LEFT JOIN subscriptions_vendors v ON v.id = t.vendor_id
  WHERE t.organisation_id = org_id
    AND t.status = 'active'
    AND t.renewal_date IS NOT NULL
    AND t.renewal_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + days_ahead)
  ORDER BY t.renewal_date ASC;
END;
$$;

-- Function to check license availability
CREATE OR REPLACE FUNCTION get_license_usage(tool_id_param UUID)
RETURNS TABLE (
  total_licenses INTEGER,
  assigned_licenses BIGINT,
  available_licenses INTEGER,
  usage_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count INTEGER;
  assigned_count BIGINT;
BEGIN
  SELECT license_count INTO total_count
  FROM subscriptions_tools
  WHERE id = tool_id_param;
  
  SELECT COUNT(*) INTO assigned_count
  FROM subscriptions_licenses
  WHERE tool_id = tool_id_param AND status = 'assigned';
  
  RETURN QUERY
  SELECT 
    total_count,
    assigned_count,
    (total_count - assigned_count::INTEGER),
    CASE WHEN total_count > 0 THEN (assigned_count::NUMERIC / total_count * 100) ELSE 0 END;
END;
$$;