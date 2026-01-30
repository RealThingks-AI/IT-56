-- Create subscription_cost_history table
CREATE TABLE IF NOT EXISTS public.subscription_cost_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions_tools(id),
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  cost NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  invoice_number TEXT,
  paid_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Create subscription_alerts table
CREATE TABLE IF NOT EXISTS public.subscription_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions_tools(id),
  alert_type TEXT NOT NULL, -- 'renewal_upcoming', 'seat_overuse', 'unused_seats', 'cost_spike'
  trigger_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Create subscription_categories table
CREATE TABLE IF NOT EXISTS public.subscription_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Add category_id to subscriptions_tools if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subscriptions_tools' AND column_name = 'category_id') THEN
    ALTER TABLE public.subscriptions_tools ADD COLUMN category_id UUID REFERENCES public.subscription_categories(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.subscription_cost_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_cost_history
CREATE POLICY "tenant_select_subscription_cost_history" ON public.subscription_cost_history
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::BIGINT);

CREATE POLICY "tenant_insert_subscription_cost_history" ON public.subscription_cost_history
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::BIGINT);

CREATE POLICY "tenant_update_subscription_cost_history" ON public.subscription_cost_history
  FOR UPDATE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::BIGINT);

CREATE POLICY "tenant_delete_subscription_cost_history" ON public.subscription_cost_history
  FOR DELETE USING (FALSE);

-- RLS Policies for subscription_alerts
CREATE POLICY "tenant_select_subscription_alerts" ON public.subscription_alerts
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::BIGINT);

CREATE POLICY "tenant_insert_subscription_alerts" ON public.subscription_alerts
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::BIGINT);

CREATE POLICY "tenant_update_subscription_alerts" ON public.subscription_alerts
  FOR UPDATE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::BIGINT);

CREATE POLICY "tenant_delete_subscription_alerts" ON public.subscription_alerts
  FOR DELETE USING (FALSE);

-- RLS Policies for subscription_categories
CREATE POLICY "tenant_select_subscription_categories" ON public.subscription_categories
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::BIGINT);

CREATE POLICY "tenant_insert_subscription_categories" ON public.subscription_categories
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::BIGINT);

CREATE POLICY "tenant_update_subscription_categories" ON public.subscription_categories
  FOR UPDATE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::BIGINT);

CREATE POLICY "tenant_delete_subscription_categories" ON public.subscription_categories
  FOR DELETE USING (FALSE);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_cost_history_tenant ON public.subscription_cost_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_cost_history_subscription ON public.subscription_cost_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_alerts_tenant ON public.subscription_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_alerts_subscription ON public.subscription_alerts(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_alerts_resolved ON public.subscription_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_subscription_categories_tenant ON public.subscription_categories(tenant_id);

-- Trigger for updated_at on categories
CREATE OR REPLACE FUNCTION update_subscription_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_categories_updated_at
  BEFORE UPDATE ON public.subscription_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_categories_updated_at();