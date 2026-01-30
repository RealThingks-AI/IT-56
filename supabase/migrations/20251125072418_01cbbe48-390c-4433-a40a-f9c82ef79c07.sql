-- Drop existing partial tables if they exist
DROP TABLE IF EXISTS public.units_of_production_log CASCADE;
DROP TABLE IF EXISTS public.depreciation_entries CASCADE;
DROP TABLE IF EXISTS public.asset_depreciation_profiles CASCADE;
DROP TABLE IF EXISTS public.depreciation_run_logs CASCADE;
DROP TABLE IF EXISTS public.depreciation_methods CASCADE;

-- Create depreciation_methods table
CREATE TABLE public.depreciation_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parameters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- Create asset_depreciation_profiles table
CREATE TABLE public.asset_depreciation_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  asset_id BIGINT NOT NULL,
  method_id UUID NOT NULL,
  cost_basis NUMERIC NOT NULL,
  salvage_value NUMERIC DEFAULT 0,
  useful_life_years INTEGER NOT NULL,
  useful_life_periods INTEGER NOT NULL,
  depreciation_start_date DATE NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  prorate_first_period BOOLEAN DEFAULT true,
  prorate_last_period BOOLEAN DEFAULT true,
  switch_to_sl_threshold BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID,
  is_deleted BOOLEAN DEFAULT false
);

-- Create depreciation_entries table
CREATE TABLE public.depreciation_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  profile_id UUID NOT NULL,
  asset_id BIGINT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  depreciation_amount NUMERIC NOT NULL,
  accumulated_depreciation NUMERIC NOT NULL,
  book_value NUMERIC NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('normal', 'adjustment', 'reversal')),
  posted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  notes TEXT
);

-- Create units_of_production_log table
CREATE TABLE public.units_of_production_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  asset_id BIGINT NOT NULL,
  profile_id UUID NOT NULL,
  usage_period DATE NOT NULL,
  units_consumed NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create depreciation_run_logs table
CREATE TABLE public.depreciation_run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  run_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL,
  entries_created INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Update itam_assets table with depreciation fields
ALTER TABLE public.itam_assets 
ADD COLUMN IF NOT EXISTS accumulated_depreciation NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS book_value NUMERIC,
ADD COLUMN IF NOT EXISTS depreciation_status TEXT,
ADD COLUMN IF NOT EXISTS current_depreciation_profile_id UUID;

-- Add constraint for depreciation_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'itam_assets_depreciation_status_check'
  ) THEN
    ALTER TABLE public.itam_assets 
    ADD CONSTRAINT itam_assets_depreciation_status_check 
    CHECK (depreciation_status IN ('active', 'fully_depreciated', 'suspended'));
  END IF;
END $$;

-- Enable RLS on all new tables
ALTER TABLE public.depreciation_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_depreciation_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depreciation_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units_of_production_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depreciation_run_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for depreciation_methods
CREATE POLICY "tenant_select_depreciation_methods" ON public.depreciation_methods
FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_insert_depreciation_methods" ON public.depreciation_methods
FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_update_depreciation_methods" ON public.depreciation_methods
FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_delete_depreciation_methods" ON public.depreciation_methods
FOR DELETE USING (false);

-- RLS Policies for asset_depreciation_profiles
CREATE POLICY "tenant_select_asset_depreciation_profiles" ON public.asset_depreciation_profiles
FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_insert_asset_depreciation_profiles" ON public.asset_depreciation_profiles
FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_update_asset_depreciation_profiles" ON public.asset_depreciation_profiles
FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_delete_asset_depreciation_profiles" ON public.asset_depreciation_profiles
FOR DELETE USING (false);

-- RLS Policies for depreciation_entries
CREATE POLICY "tenant_select_depreciation_entries" ON public.depreciation_entries
FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_insert_depreciation_entries" ON public.depreciation_entries
FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_update_depreciation_entries" ON public.depreciation_entries
FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_delete_depreciation_entries" ON public.depreciation_entries
FOR DELETE USING (false);

-- RLS Policies for units_of_production_log
CREATE POLICY "tenant_select_units_of_production_log" ON public.units_of_production_log
FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_insert_units_of_production_log" ON public.units_of_production_log
FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_update_units_of_production_log" ON public.units_of_production_log
FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_delete_units_of_production_log" ON public.units_of_production_log
FOR DELETE USING (false);

-- RLS Policies for depreciation_run_logs
CREATE POLICY "tenant_select_depreciation_run_logs" ON public.depreciation_run_logs
FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_insert_depreciation_run_logs" ON public.depreciation_run_logs
FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_update_depreciation_run_logs" ON public.depreciation_run_logs
FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_delete_depreciation_run_logs" ON public.depreciation_run_logs
FOR DELETE USING (false);

-- Create indexes for performance
CREATE INDEX idx_depreciation_methods_tenant ON depreciation_methods(tenant_id);
CREATE INDEX idx_asset_depreciation_profiles_tenant ON asset_depreciation_profiles(tenant_id);
CREATE INDEX idx_asset_depreciation_profiles_asset ON asset_depreciation_profiles(asset_id);
CREATE INDEX idx_depreciation_entries_tenant ON depreciation_entries(tenant_id);
CREATE INDEX idx_depreciation_entries_profile ON depreciation_entries(profile_id);
CREATE INDEX idx_depreciation_entries_asset ON depreciation_entries(asset_id);
CREATE INDEX idx_units_of_production_log_tenant ON units_of_production_log(tenant_id);
CREATE INDEX idx_depreciation_run_logs_tenant ON depreciation_run_logs(tenant_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_depreciation_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_asset_depreciation_profiles_updated_at
BEFORE UPDATE ON asset_depreciation_profiles
FOR EACH ROW
EXECUTE FUNCTION update_depreciation_profile_updated_at();

-- Insert default depreciation methods for tenant 1
INSERT INTO public.depreciation_methods (tenant_id, code, name, description, parameters) VALUES
(1, 'SL', 'Straight Line', 'Equal depreciation over useful life', '{}'),
(1, 'DB', 'Declining Balance', 'Accelerated depreciation with factor', '{"factor": 2.0}'),
(1, 'DDB', 'Double Declining Balance', 'Accelerated depreciation at 200%', '{"factor": 2.0}'),
(1, 'SYD', 'Sum of Years Digits', 'Accelerated depreciation by year fraction', '{}'),
(1, 'UOP', 'Units of Production', 'Based on actual usage/production', '{"total_units": 100000}');