-- =============================================
-- ITAM/Assets Tables for Assets Module
-- =============================================

-- Sites table
CREATE TABLE IF NOT EXISTS public.itam_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  is_active BOOLEAN DEFAULT true,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.itam_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_itam_sites" ON public.itam_sites
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Locations table
CREATE TABLE IF NOT EXISTS public.itam_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  site_id UUID REFERENCES public.itam_sites(id) ON DELETE SET NULL,
  floor TEXT,
  room TEXT,
  is_active BOOLEAN DEFAULT true,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.itam_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_itam_locations" ON public.itam_locations
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Categories table
CREATE TABLE IF NOT EXISTS public.itam_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.itam_categories(id),
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.itam_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_itam_categories" ON public.itam_categories
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Departments table
CREATE TABLE IF NOT EXISTS public.itam_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID,
  is_active BOOLEAN DEFAULT true,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.itam_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_itam_departments" ON public.itam_departments
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Makes (manufacturers) table
CREATE TABLE IF NOT EXISTS public.itam_makes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  support_phone TEXT,
  support_email TEXT,
  is_active BOOLEAN DEFAULT true,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.itam_makes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_itam_makes" ON public.itam_makes
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Vendors table
CREATE TABLE IF NOT EXISTS public.itam_vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  website TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.itam_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_itam_vendors" ON public.itam_vendors
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Tag format table
CREATE TABLE IF NOT EXISTS public.itam_tag_format (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prefix TEXT NOT NULL DEFAULT 'AS-',
  padding_length INTEGER DEFAULT 5,
  auto_increment BOOLEAN DEFAULT true,
  next_number INTEGER DEFAULT 1,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.itam_tag_format ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_itam_tag_format" ON public.itam_tag_format
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Tag series for category-specific prefixes
CREATE TABLE IF NOT EXISTS public.itam_tag_series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  current_number INTEGER DEFAULT 1,
  padding_length INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.itam_tag_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_itam_tag_series" ON public.itam_tag_series
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Main Assets table
CREATE TABLE IF NOT EXISTS public.itam_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id TEXT NOT NULL,
  asset_tag TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.itam_categories(id),
  make_id UUID REFERENCES public.itam_makes(id),
  model TEXT,
  serial_number TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired', 'disposed', 'lost')),
  location_id UUID REFERENCES public.itam_locations(id),
  department_id UUID REFERENCES public.itam_departments(id),
  assigned_to UUID,
  purchase_date DATE,
  purchase_price DECIMAL(12,2),
  vendor_id UUID REFERENCES public.itam_vendors(id),
  warranty_expiry DATE,
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

ALTER TABLE public.itam_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_itam_assets" ON public.itam_assets
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Asset assignments tracking
CREATE TABLE IF NOT EXISTS public.itam_asset_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.itam_assets(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL,
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  returned_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.itam_asset_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_itam_asset_assignments" ON public.itam_asset_assignments
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Asset history/audit trail
CREATE TABLE IF NOT EXISTS public.itam_asset_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.itam_assets(id) ON DELETE CASCADE,
  asset_tag TEXT,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  details JSONB,
  performed_by UUID,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.itam_asset_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_itam_asset_history" ON public.itam_asset_history
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Licenses table
CREATE TABLE IF NOT EXISTS public.itam_licenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  vendor_id UUID REFERENCES public.itam_vendors(id),
  license_key TEXT,
  license_type TEXT DEFAULT 'perpetual',
  seats_total INTEGER DEFAULT 1,
  seats_allocated INTEGER DEFAULT 0,
  purchase_date DATE,
  expiry_date DATE,
  cost DECIMAL(12,2),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.itam_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_itam_licenses" ON public.itam_licenses
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- License allocations
CREATE TABLE IF NOT EXISTS public.itam_license_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES public.itam_licenses(id) ON DELETE CASCADE,
  user_id UUID,
  asset_id UUID REFERENCES public.itam_assets(id),
  allocated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deallocated_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.itam_license_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_itam_license_allocations" ON public.itam_license_allocations
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Purchase orders
CREATE TABLE IF NOT EXISTS public.itam_purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  po_number TEXT NOT NULL,
  vendor_id UUID REFERENCES public.itam_vendors(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'ordered', 'received', 'cancelled')),
  order_date DATE,
  expected_date DATE,
  received_date DATE,
  total_amount DECIMAL(12,2),
  notes TEXT,
  items JSONB DEFAULT '[]',
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.itam_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_itam_purchase_orders" ON public.itam_purchase_orders
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Repairs table
CREATE TABLE IF NOT EXISTS public.itam_repairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID REFERENCES public.itam_assets(id) ON DELETE SET NULL,
  repair_number TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  issue_description TEXT NOT NULL,
  diagnosis TEXT,
  resolution TEXT,
  vendor_id UUID REFERENCES public.itam_vendors(id),
  cost DECIMAL(12,2),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.itam_repairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_itam_repairs" ON public.itam_repairs
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Settings table
CREATE TABLE IF NOT EXISTS public.itam_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  value JSONB,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(key, organisation_id)
);

ALTER TABLE public.itam_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_itam_settings" ON public.itam_settings
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Company info for reports
CREATE TABLE IF NOT EXISTS public.itam_company_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE UNIQUE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.itam_company_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_itam_company_info" ON public.itam_company_info
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Category tag formats for different prefixes per category
CREATE TABLE IF NOT EXISTS public.category_tag_formats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.itam_categories(id) ON DELETE CASCADE,
  prefix TEXT NOT NULL,
  padding_length INTEGER DEFAULT 5,
  current_number INTEGER DEFAULT 1,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(category_id, organisation_id)
);

ALTER TABLE public.category_tag_formats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_category_tag_formats" ON public.category_tag_formats
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Depreciation profiles
CREATE TABLE IF NOT EXISTS public.asset_depreciation_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  method TEXT DEFAULT 'straight_line' CHECK (method IN ('straight_line', 'declining_balance', 'sum_of_years', 'units_of_production')),
  useful_life_years INTEGER DEFAULT 5,
  salvage_value_percent DECIMAL(5,2) DEFAULT 10.00,
  is_active BOOLEAN DEFAULT true,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.asset_depreciation_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_asset_depreciation_profiles" ON public.asset_depreciation_profiles
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Depreciation entries
CREATE TABLE IF NOT EXISTS public.depreciation_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID REFERENCES public.itam_assets(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.asset_depreciation_profiles(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  depreciation_amount DECIMAL(12,2) NOT NULL,
  accumulated_depreciation DECIMAL(12,2) NOT NULL,
  book_value DECIMAL(12,2) NOT NULL,
  notes TEXT,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.depreciation_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_depreciation_entries" ON public.depreciation_entries
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Depreciation run logs
CREATE TABLE IF NOT EXISTS public.depreciation_run_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  entries_created INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  error_message TEXT,
  run_by UUID,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.depreciation_run_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_depreciation_run_logs" ON public.depreciation_run_logs
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_itam_assets_organisation ON public.itam_assets(organisation_id);
CREATE INDEX IF NOT EXISTS idx_itam_assets_status ON public.itam_assets(status);
CREATE INDEX IF NOT EXISTS idx_itam_assets_category ON public.itam_assets(category_id);
CREATE INDEX IF NOT EXISTS idx_itam_asset_history_asset ON public.itam_asset_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_itam_asset_assignments_asset ON public.itam_asset_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_depreciation_entries_asset ON public.depreciation_entries(asset_id);