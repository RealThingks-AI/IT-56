-- IT Asset Management (ITAM) Database Schema
-- All tables include tenant_id for multi-tenancy and proper RLS policies

-- 1. Assets table
CREATE TABLE IF NOT EXISTS public.itam_assets (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  organisation_id UUID,
  asset_tag TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  mac_address TEXT,
  hostname TEXT,
  purchase_order_id BIGINT,
  purchase_date DATE,
  purchase_price NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',
  vendor_id BIGINT,
  warranty_end DATE,
  amc_end DATE,
  location TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'in_repair', 'retired', 'lost', 'disposed')),
  assigned_to UUID,
  assigned_date TIMESTAMP WITH TIME ZONE,
  expected_return_date DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_itam_assets_tenant ON public.itam_assets(tenant_id);
CREATE INDEX idx_itam_assets_org ON public.itam_assets(organisation_id);
CREATE INDEX idx_itam_assets_status ON public.itam_assets(status);
CREATE INDEX idx_itam_assets_assigned ON public.itam_assets(assigned_to);

-- 2. Asset history table
CREATE TABLE IF NOT EXISTS public.itam_asset_history (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  asset_id BIGINT NOT NULL REFERENCES public.itam_assets(id),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  performed_by UUID,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_itam_history_tenant ON public.itam_asset_history(tenant_id);
CREATE INDEX idx_itam_history_asset ON public.itam_asset_history(asset_id);

-- 3. Asset assignments table
CREATE TABLE IF NOT EXISTS public.itam_asset_assignments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  asset_id BIGINT NOT NULL REFERENCES public.itam_assets(id),
  user_id UUID NOT NULL,
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expected_return_at DATE,
  returned_at TIMESTAMP WITH TIME ZONE,
  return_condition TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_itam_assignments_tenant ON public.itam_asset_assignments(tenant_id);
CREATE INDEX idx_itam_assignments_asset ON public.itam_asset_assignments(asset_id);
CREATE INDEX idx_itam_assignments_user ON public.itam_asset_assignments(user_id);

-- 4. Vendors table
CREATE TABLE IF NOT EXISTS public.itam_vendors (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  organisation_id UUID,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  website TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_itam_vendors_tenant ON public.itam_vendors(tenant_id);
CREATE INDEX idx_itam_vendors_org ON public.itam_vendors(organisation_id);

-- 5. Purchase orders table
CREATE TABLE IF NOT EXISTS public.itam_purchase_orders (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  organisation_id UUID,
  po_number TEXT NOT NULL UNIQUE,
  vendor_id BIGINT REFERENCES public.itam_vendors(id),
  items JSONB DEFAULT '[]'::jsonb,
  total_amount NUMERIC(12,2),
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'received', 'cancelled')),
  ordered_date DATE,
  received_date DATE,
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_itam_po_tenant ON public.itam_purchase_orders(tenant_id);
CREATE INDEX idx_itam_po_org ON public.itam_purchase_orders(organisation_id);
CREATE INDEX idx_itam_po_vendor ON public.itam_purchase_orders(vendor_id);

-- 6. Repairs table
CREATE TABLE IF NOT EXISTS public.itam_repairs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  asset_id BIGINT NOT NULL REFERENCES public.itam_assets(id),
  vendor_id BIGINT REFERENCES public.itam_vendors(id),
  ticket_number TEXT,
  issue_description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  estimated_cost NUMERIC(10,2),
  actual_cost NUMERIC(10,2),
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  attachments TEXT[],
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_itam_repairs_tenant ON public.itam_repairs(tenant_id);
CREATE INDEX idx_itam_repairs_asset ON public.itam_repairs(asset_id);
CREATE INDEX idx_itam_repairs_status ON public.itam_repairs(status);

-- 7. Licenses table
CREATE TABLE IF NOT EXISTS public.itam_licenses (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  organisation_id UUID,
  name TEXT NOT NULL,
  vendor_id BIGINT REFERENCES public.itam_vendors(id),
  purchase_date DATE,
  seats_total INTEGER NOT NULL DEFAULT 1,
  seats_allocated INTEGER NOT NULL DEFAULT 0,
  expiry_date DATE,
  license_key TEXT,
  attachments TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  CONSTRAINT seats_check CHECK (seats_allocated <= seats_total)
);

CREATE INDEX idx_itam_licenses_tenant ON public.itam_licenses(tenant_id);
CREATE INDEX idx_itam_licenses_org ON public.itam_licenses(organisation_id);

-- 8. License allocations table
CREATE TABLE IF NOT EXISTS public.itam_license_allocations (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  license_id BIGINT NOT NULL REFERENCES public.itam_licenses(id),
  asset_id BIGINT REFERENCES public.itam_assets(id),
  user_id UUID,
  allocated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  released_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_itam_license_alloc_tenant ON public.itam_license_allocations(tenant_id);
CREATE INDEX idx_itam_license_alloc_license ON public.itam_license_allocations(license_id);

-- 9. Asset tags table (for custom tagging)
CREATE TABLE IF NOT EXISTS public.itam_asset_tags (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  tag_type TEXT NOT NULL,
  tag_value TEXT NOT NULL,
  asset_id BIGINT NOT NULL REFERENCES public.itam_assets(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_itam_tags_tenant ON public.itam_asset_tags(tenant_id);
CREATE INDEX idx_itam_tags_asset ON public.itam_asset_tags(asset_id);

-- 10. Asset settings table
CREATE TABLE IF NOT EXISTS public.itam_settings (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  key TEXT NOT NULL,
  value JSONB DEFAULT '{}'::jsonb,
  UNIQUE(tenant_id, key)
);

-- Enable RLS on all tables
ALTER TABLE public.itam_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itam_asset_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itam_asset_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itam_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itam_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itam_repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itam_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itam_license_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itam_asset_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itam_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for itam_assets
CREATE POLICY "tenant_select_itam_assets" ON public.itam_assets
FOR SELECT USING (
  (organisation_id = get_user_org()) OR 
  (tenant_id = get_user_tenant(auth.uid()))
);

CREATE POLICY "tenant_insert_itam_assets" ON public.itam_assets
FOR INSERT WITH CHECK (
  (organisation_id = get_user_org()) OR 
  (tenant_id = get_user_tenant(auth.uid()))
);

CREATE POLICY "tenant_update_itam_assets" ON public.itam_assets
FOR UPDATE USING (
  (organisation_id = get_user_org()) OR 
  (tenant_id = get_user_tenant(auth.uid()))
);

-- RLS Policies for itam_asset_history
CREATE POLICY "tenant_select_itam_asset_history" ON public.itam_asset_history
FOR SELECT USING (
  tenant_id = get_user_tenant(auth.uid()) OR
  asset_id IN (SELECT id FROM public.itam_assets WHERE organisation_id = get_user_org())
);

CREATE POLICY "tenant_insert_itam_asset_history" ON public.itam_asset_history
FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant(auth.uid()) OR
  asset_id IN (SELECT id FROM public.itam_assets WHERE organisation_id = get_user_org())
);

-- RLS Policies for itam_asset_assignments
CREATE POLICY "tenant_select_itam_asset_assignments" ON public.itam_asset_assignments
FOR SELECT USING (
  tenant_id = get_user_tenant(auth.uid()) OR
  asset_id IN (SELECT id FROM public.itam_assets WHERE organisation_id = get_user_org())
);

CREATE POLICY "tenant_insert_itam_asset_assignments" ON public.itam_asset_assignments
FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant(auth.uid()) OR
  asset_id IN (SELECT id FROM public.itam_assets WHERE organisation_id = get_user_org())
);

CREATE POLICY "tenant_update_itam_asset_assignments" ON public.itam_asset_assignments
FOR UPDATE USING (
  tenant_id = get_user_tenant(auth.uid()) OR
  asset_id IN (SELECT id FROM public.itam_assets WHERE organisation_id = get_user_org())
);

-- RLS Policies for itam_vendors
CREATE POLICY "tenant_select_itam_vendors" ON public.itam_vendors
FOR SELECT USING (
  (organisation_id = get_user_org()) OR 
  (tenant_id = get_user_tenant(auth.uid()))
);

CREATE POLICY "tenant_manage_itam_vendors" ON public.itam_vendors
FOR ALL USING (
  (organisation_id = get_user_org()) OR 
  (tenant_id = get_user_tenant(auth.uid()))
);

-- RLS Policies for itam_purchase_orders
CREATE POLICY "tenant_select_itam_purchase_orders" ON public.itam_purchase_orders
FOR SELECT USING (
  (organisation_id = get_user_org()) OR 
  (tenant_id = get_user_tenant(auth.uid()))
);

CREATE POLICY "tenant_manage_itam_purchase_orders" ON public.itam_purchase_orders
FOR ALL USING (
  (organisation_id = get_user_org()) OR 
  (tenant_id = get_user_tenant(auth.uid()))
);

-- RLS Policies for itam_repairs
CREATE POLICY "tenant_select_itam_repairs" ON public.itam_repairs
FOR SELECT USING (
  tenant_id = get_user_tenant(auth.uid()) OR
  asset_id IN (SELECT id FROM public.itam_assets WHERE organisation_id = get_user_org())
);

CREATE POLICY "tenant_manage_itam_repairs" ON public.itam_repairs
FOR ALL USING (
  tenant_id = get_user_tenant(auth.uid()) OR
  asset_id IN (SELECT id FROM public.itam_assets WHERE organisation_id = get_user_org())
);

-- RLS Policies for itam_licenses
CREATE POLICY "tenant_select_itam_licenses" ON public.itam_licenses
FOR SELECT USING (
  (organisation_id = get_user_org()) OR 
  (tenant_id = get_user_tenant(auth.uid()))
);

CREATE POLICY "tenant_manage_itam_licenses" ON public.itam_licenses
FOR ALL USING (
  (organisation_id = get_user_org()) OR 
  (tenant_id = get_user_tenant(auth.uid()))
);

-- RLS Policies for itam_license_allocations
CREATE POLICY "tenant_select_itam_license_allocations" ON public.itam_license_allocations
FOR SELECT USING (
  tenant_id = get_user_tenant(auth.uid()) OR
  license_id IN (SELECT id FROM public.itam_licenses WHERE organisation_id = get_user_org())
);

CREATE POLICY "tenant_manage_itam_license_allocations" ON public.itam_license_allocations
FOR ALL USING (
  tenant_id = get_user_tenant(auth.uid()) OR
  license_id IN (SELECT id FROM public.itam_licenses WHERE organisation_id = get_user_org())
);

-- RLS Policies for itam_asset_tags
CREATE POLICY "tenant_manage_itam_asset_tags" ON public.itam_asset_tags
FOR ALL USING (
  tenant_id = get_user_tenant(auth.uid()) OR
  asset_id IN (SELECT id FROM public.itam_assets WHERE organisation_id = get_user_org())
);

-- RLS Policies for itam_settings
CREATE POLICY "tenant_manage_itam_settings" ON public.itam_settings
FOR ALL USING (tenant_id = get_user_tenant(auth.uid()));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_itam_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_itam_assets_updated_at
  BEFORE UPDATE ON public.itam_assets
  FOR EACH ROW EXECUTE FUNCTION update_itam_updated_at();

CREATE TRIGGER update_itam_vendors_updated_at
  BEFORE UPDATE ON public.itam_vendors
  FOR EACH ROW EXECUTE FUNCTION update_itam_updated_at();

CREATE TRIGGER update_itam_purchase_orders_updated_at
  BEFORE UPDATE ON public.itam_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_itam_updated_at();

CREATE TRIGGER update_itam_repairs_updated_at
  BEFORE UPDATE ON public.itam_repairs
  FOR EACH ROW EXECUTE FUNCTION update_itam_updated_at();

CREATE TRIGGER update_itam_licenses_updated_at
  BEFORE UPDATE ON public.itam_licenses
  FOR EACH ROW EXECUTE FUNCTION update_itam_updated_at();

-- Function to auto-generate asset tag
CREATE OR REPLACE FUNCTION generate_asset_tag(tenant_id_param BIGINT)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  asset_tag TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(asset_tag FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM itam_assets
  WHERE tenant_id = tenant_id_param;
  
  asset_tag := 'AST-' || LPAD(next_number::TEXT, 6, '0');
  RETURN asset_tag;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to log asset history
CREATE OR REPLACE FUNCTION log_asset_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO itam_asset_history (tenant_id, asset_id, action, details, performed_by)
      VALUES (
        NEW.tenant_id,
        NEW.id,
        'status_changed',
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status),
        NEW.updated_by
      );
    END IF;
    
    -- Log assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO itam_asset_history (tenant_id, asset_id, action, details, performed_by)
      VALUES (
        NEW.tenant_id,
        NEW.id,
        CASE WHEN NEW.assigned_to IS NULL THEN 'returned' ELSE 'assigned' END,
        jsonb_build_object('old_user', OLD.assigned_to, 'new_user', NEW.assigned_to),
        NEW.updated_by
      );
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO itam_asset_history (tenant_id, asset_id, action, details, performed_by)
    VALUES (
      NEW.tenant_id,
      NEW.id,
      'created',
      jsonb_build_object('asset_tag', NEW.asset_tag, 'name', NEW.name),
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_itam_asset_history
  AFTER INSERT OR UPDATE ON public.itam_assets
  FOR EACH ROW EXECUTE FUNCTION log_asset_history();

-- Function to update license seat allocations
CREATE OR REPLACE FUNCTION update_license_seats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.released_at IS NULL THEN
    UPDATE itam_licenses
    SET seats_allocated = seats_allocated + 1
    WHERE id = NEW.license_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.released_at IS NULL AND NEW.released_at IS NOT NULL THEN
    UPDATE itam_licenses
    SET seats_allocated = seats_allocated - 1
    WHERE id = NEW.license_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_itam_license_seats
  AFTER INSERT OR UPDATE ON public.itam_license_allocations
  FOR EACH ROW EXECUTE FUNCTION update_license_seats();