-- ====================================
-- IT Asset Management Module - Database Schema (Clean Setup)
-- ====================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "tenant_select_itam_assets" ON public.itam_assets;
DROP POLICY IF EXISTS "tenant_insert_itam_assets" ON public.itam_assets;
DROP POLICY IF EXISTS "tenant_update_itam_assets" ON public.itam_assets;
DROP POLICY IF EXISTS "tenant_select_itam_asset_history" ON public.itam_asset_history;
DROP POLICY IF EXISTS "tenant_insert_itam_asset_history" ON public.itam_asset_history;
DROP POLICY IF EXISTS "tenant_select_itam_assignments" ON public.itam_asset_assignments;
DROP POLICY IF EXISTS "tenant_insert_itam_assignments" ON public.itam_asset_assignments;
DROP POLICY IF EXISTS "tenant_update_itam_assignments" ON public.itam_asset_assignments;
DROP POLICY IF EXISTS "tenant_select_itam_vendors" ON public.itam_vendors;
DROP POLICY IF EXISTS "tenant_insert_itam_vendors" ON public.itam_vendors;
DROP POLICY IF EXISTS "tenant_update_itam_vendors" ON public.itam_vendors;
DROP POLICY IF EXISTS "tenant_select_itam_pos" ON public.itam_purchase_orders;
DROP POLICY IF EXISTS "tenant_insert_itam_pos" ON public.itam_purchase_orders;
DROP POLICY IF EXISTS "tenant_update_itam_pos" ON public.itam_purchase_orders;
DROP POLICY IF EXISTS "tenant_select_itam_repairs" ON public.itam_repairs;
DROP POLICY IF EXISTS "tenant_insert_itam_repairs" ON public.itam_repairs;
DROP POLICY IF EXISTS "tenant_update_itam_repairs" ON public.itam_repairs;
DROP POLICY IF EXISTS "tenant_select_itam_licenses" ON public.itam_licenses;
DROP POLICY IF EXISTS "tenant_insert_itam_licenses" ON public.itam_licenses;
DROP POLICY IF EXISTS "tenant_update_itam_licenses" ON public.itam_licenses;
DROP POLICY IF EXISTS "tenant_select_itam_license_alloc" ON public.itam_license_allocations;
DROP POLICY IF EXISTS "tenant_insert_itam_license_alloc" ON public.itam_license_allocations;
DROP POLICY IF EXISTS "tenant_update_itam_license_alloc" ON public.itam_license_allocations;
DROP POLICY IF EXISTS "tenant_all_itam_tags" ON public.itam_asset_tags;
DROP POLICY IF EXISTS "tenant_all_itam_settings" ON public.itam_settings;

-- Create missing tables

-- Asset Tags (if not exists)
CREATE TABLE IF NOT EXISTS public.itam_asset_tags (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  tag_type TEXT NOT NULL,
  tag_value TEXT NOT NULL,
  asset_id BIGINT NOT NULL REFERENCES public.itam_assets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asset Settings (if not exists)
CREATE TABLE IF NOT EXISTS public.itam_settings (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL UNIQUE,
  key TEXT NOT NULL,
  value JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_itam_license_alloc_license ON public.itam_license_allocations(license_id);
CREATE INDEX IF NOT EXISTS idx_itam_license_alloc_asset ON public.itam_license_allocations(asset_id);
CREATE INDEX IF NOT EXISTS idx_itam_tags_asset ON public.itam_asset_tags(asset_id);

-- ====================================
-- RLS Policies (Recreate all)
-- ====================================

-- Assets
ALTER TABLE public.itam_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_itam_assets" ON public.itam_assets
  FOR SELECT USING (
    (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
    OR (organisation_id = (SELECT organisation_id FROM public.users WHERE auth_user_id = auth.uid()))
  );

CREATE POLICY "tenant_insert_itam_assets" ON public.itam_assets
  FOR INSERT WITH CHECK (
    (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
    OR (organisation_id = (SELECT organisation_id FROM public.users WHERE auth_user_id = auth.uid()))
  );

CREATE POLICY "tenant_update_itam_assets" ON public.itam_assets
  FOR UPDATE USING (
    (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
    OR (organisation_id = (SELECT organisation_id FROM public.users WHERE auth_user_id = auth.uid()))
  );

-- Asset History
ALTER TABLE public.itam_asset_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_itam_asset_history" ON public.itam_asset_history
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "tenant_insert_itam_asset_history" ON public.itam_asset_history
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Asset Assignments
ALTER TABLE public.itam_asset_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_itam_assignments" ON public.itam_asset_assignments
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "tenant_insert_itam_assignments" ON public.itam_asset_assignments
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "tenant_update_itam_assignments" ON public.itam_asset_assignments
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Vendors
ALTER TABLE public.itam_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_itam_vendors" ON public.itam_vendors
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "tenant_insert_itam_vendors" ON public.itam_vendors
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "tenant_update_itam_vendors" ON public.itam_vendors
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Purchase Orders
ALTER TABLE public.itam_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_itam_pos" ON public.itam_purchase_orders
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "tenant_insert_itam_pos" ON public.itam_purchase_orders
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "tenant_update_itam_pos" ON public.itam_purchase_orders
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Repairs
ALTER TABLE public.itam_repairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_itam_repairs" ON public.itam_repairs
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "tenant_insert_itam_repairs" ON public.itam_repairs
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "tenant_update_itam_repairs" ON public.itam_repairs
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Licenses
ALTER TABLE public.itam_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_itam_licenses" ON public.itam_licenses
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "tenant_insert_itam_licenses" ON public.itam_licenses
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "tenant_update_itam_licenses" ON public.itam_licenses
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- License Allocations
ALTER TABLE public.itam_license_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_itam_license_alloc" ON public.itam_license_allocations
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "tenant_insert_itam_license_alloc" ON public.itam_license_allocations
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "tenant_update_itam_license_alloc" ON public.itam_license_allocations
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Asset Tags
ALTER TABLE public.itam_asset_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_all_itam_tags" ON public.itam_asset_tags
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Settings
ALTER TABLE public.itam_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_all_itam_settings" ON public.itam_settings
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );