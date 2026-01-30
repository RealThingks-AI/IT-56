-- Create asset_assignments table to track asset assignments to users
CREATE TABLE IF NOT EXISTS public.asset_assignments (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL,
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  returned_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  condition_at_assignment TEXT,
  condition_at_return TEXT,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id),
  organisation_id UUID REFERENCES public.organisations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_asset_assignments_asset_id ON public.asset_assignments(asset_id);
CREATE INDEX idx_asset_assignments_assigned_to ON public.asset_assignments(assigned_to);
CREATE INDEX idx_asset_assignments_org_id ON public.asset_assignments(organisation_id);
CREATE INDEX idx_asset_assignments_tenant_id ON public.asset_assignments(tenant_id);

-- Enable RLS
ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_assignments
CREATE POLICY "org_isolation_select_asset_assignments"
  ON public.asset_assignments
  FOR SELECT
  USING (
    organisation_id = get_user_org() OR 
    (organisation_id IS NULL AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "org_isolation_insert_asset_assignments"
  ON public.asset_assignments
  FOR INSERT
  WITH CHECK (
    organisation_id = get_user_org() OR 
    (organisation_id IS NULL AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "org_isolation_update_asset_assignments"
  ON public.asset_assignments
  FOR UPDATE
  USING (
    organisation_id = get_user_org() OR 
    (organisation_id IS NULL AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "org_isolation_delete_asset_assignments"
  ON public.asset_assignments
  FOR DELETE
  USING (
    (organisation_id = get_user_org() OR 
     (organisation_id IS NULL AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())))
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- Create asset_licenses table for software licenses
CREATE TABLE IF NOT EXISTS public.asset_licenses (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  license_key TEXT,
  software_name TEXT NOT NULL,
  vendor TEXT,
  license_type TEXT CHECK (license_type IN ('perpetual', 'subscription', 'trial')),
  purchase_date DATE,
  expiry_date DATE,
  seats_total INTEGER NOT NULL DEFAULT 1,
  seats_used INTEGER NOT NULL DEFAULT 0,
  cost NUMERIC(10,2),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  notes TEXT,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id),
  organisation_id UUID REFERENCES public.organisations(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_asset_licenses_org_id ON public.asset_licenses(organisation_id);
CREATE INDEX idx_asset_licenses_tenant_id ON public.asset_licenses(tenant_id);
CREATE INDEX idx_asset_licenses_expiry_date ON public.asset_licenses(expiry_date);

-- Enable RLS
ALTER TABLE public.asset_licenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_licenses
CREATE POLICY "org_isolation_select_asset_licenses"
  ON public.asset_licenses
  FOR SELECT
  USING (
    organisation_id = get_user_org() OR 
    (organisation_id IS NULL AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "org_isolation_manage_asset_licenses"
  ON public.asset_licenses
  FOR ALL
  USING (
    (organisation_id = get_user_org() OR 
     (organisation_id IS NULL AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())))
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'owner', 'editor')
    )
  );

-- Create license_assignments table to track license assignments to users
CREATE TABLE IF NOT EXISTS public.license_assignments (
  id BIGSERIAL PRIMARY KEY,
  license_id BIGINT NOT NULL REFERENCES public.asset_licenses(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL,
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id),
  organisation_id UUID REFERENCES public.organisations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_license_assignments_license_id ON public.license_assignments(license_id);
CREATE INDEX idx_license_assignments_assigned_to ON public.license_assignments(assigned_to);

-- Enable RLS
ALTER TABLE public.license_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "org_isolation_license_assignments"
  ON public.license_assignments
  FOR ALL
  USING (
    organisation_id = get_user_org() OR 
    (organisation_id IS NULL AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  );

-- Create triggers for updated_at
CREATE TRIGGER update_asset_assignments_updated_at
  BEFORE UPDATE ON public.asset_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asset_licenses_updated_at
  BEFORE UPDATE ON public.asset_licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();