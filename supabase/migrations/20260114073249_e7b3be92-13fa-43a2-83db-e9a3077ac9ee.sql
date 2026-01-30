-- =============================================
-- Subscription Management Tables
-- =============================================

-- Subscription plans table (for defining available plans)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  monthly_price DECIMAL(10,2) DEFAULT 0.00,
  yearly_price DECIMAL(10,2) DEFAULT 0.00,
  max_users INTEGER DEFAULT 5,
  max_tools INTEGER DEFAULT 3,
  max_storage_mb INTEGER DEFAULT 1024,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_view_plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

-- Subscriptions table (organisation's current subscription)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  plan_name TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'grace', 'trial')),
  limits JSONB DEFAULT '{"max_users": 5, "max_tools": 3}',
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_subscriptions" ON public.subscriptions
  FOR ALL USING (organisation_id = get_user_org());

-- Subscription vendors (software/service vendors)
CREATE TABLE IF NOT EXISTS public.subscriptions_vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.subscriptions_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_subscriptions_vendors" ON public.subscriptions_vendors
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Subscription tools (software tools/services tracked)
CREATE TABLE IF NOT EXISTS public.subscriptions_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_name TEXT NOT NULL,
  vendor_id UUID REFERENCES public.subscriptions_vendors(id),
  category TEXT,
  description TEXT,
  website_url TEXT,
  license_count INTEGER DEFAULT 1,
  cost_per_license DECIMAL(10,2),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'one_time')),
  total_cost DECIMAL(10,2),
  renewal_date DATE,
  contract_start_date DATE,
  contract_end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'cancelled')),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.subscriptions_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_subscriptions_tools" ON public.subscriptions_tools
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Subscription licenses (license assignments)
CREATE TABLE IF NOT EXISTS public.subscriptions_licenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id UUID NOT NULL REFERENCES public.subscriptions_tools(id) ON DELETE CASCADE,
  assigned_to UUID,
  assigned_to_email TEXT,
  assigned_to_name TEXT,
  license_key TEXT,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'available', 'expired', 'revoked')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.subscriptions_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_subscriptions_licenses" ON public.subscriptions_licenses
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Subscription payments tracking
CREATE TABLE IF NOT EXISTS public.subscriptions_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id UUID REFERENCES public.subscriptions_tools(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_date DATE NOT NULL,
  payment_method TEXT,
  invoice_number TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  notes TEXT,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.subscriptions_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_subscriptions_payments" ON public.subscriptions_payments
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Subscription reminders
CREATE TABLE IF NOT EXISTS public.subscriptions_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id UUID REFERENCES public.subscriptions_tools(id) ON DELETE CASCADE,
  reminder_type TEXT DEFAULT 'renewal' CHECK (reminder_type IN ('renewal', 'expiry', 'payment', 'custom')),
  reminder_date DATE NOT NULL,
  message TEXT,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.subscriptions_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_subscriptions_reminders" ON public.subscriptions_reminders
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Subscription alerts
CREATE TABLE IF NOT EXISTS public.subscription_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id UUID REFERENCES public.subscriptions_tools(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.subscription_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_subscription_alerts" ON public.subscription_alerts
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Insert default subscription plans
INSERT INTO public.subscription_plans (plan_name, display_name, description, monthly_price, max_users, max_tools, max_storage_mb, features)
VALUES 
  ('free', 'Free', 'Basic features for small teams', 0.00, 5, 3, 1024, '["basic_support", "email_notifications"]'),
  ('starter', 'Starter', 'For growing teams', 29.00, 15, 10, 5120, '["basic_support", "email_notifications", "api_access"]'),
  ('professional', 'Professional', 'For professional teams', 79.00, 50, 25, 20480, '["priority_support", "email_notifications", "api_access", "custom_branding"]'),
  ('enterprise', 'Enterprise', 'Unlimited features for large organizations', 199.00, -1, -1, -1, '["premium_support", "email_notifications", "api_access", "custom_branding", "sso", "audit_logs"]')
ON CONFLICT (plan_name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_tools_org ON public.subscriptions_tools(organisation_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tools_status ON public.subscriptions_tools(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_licenses_tool ON public.subscriptions_licenses(tool_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payments_tool ON public.subscriptions_payments(tool_id);