-- Update itam_assets table with AssetTiger-style fields
ALTER TABLE itam_assets 
ADD COLUMN IF NOT EXISTS asset_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS asset_configuration TEXT,
ADD COLUMN IF NOT EXISTS serial_number TEXT,
ADD COLUMN IF NOT EXISTS cost NUMERIC,
ADD COLUMN IF NOT EXISTS purchased_from TEXT,
ADD COLUMN IF NOT EXISTS classification TEXT,
ADD COLUMN IF NOT EXISTS site TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS checkout_notes TEXT,
ADD COLUMN IF NOT EXISTS checkout_date DATE,
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Create asset_events table for tracking all asset events
CREATE TABLE IF NOT EXISTS asset_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  asset_id BIGINT NOT NULL REFERENCES itam_assets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_description TEXT,
  performed_by UUID,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create asset_photos table
CREATE TABLE IF NOT EXISTS asset_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  asset_id BIGINT NOT NULL REFERENCES itam_assets(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  uploaded_by UUID,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create asset_documents table
CREATE TABLE IF NOT EXISTS asset_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  asset_id BIGINT NOT NULL REFERENCES itam_assets(id) ON DELETE CASCADE,
  document_type TEXT,
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  uploaded_by UUID,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create asset_warranties table
CREATE TABLE IF NOT EXISTS asset_warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  asset_id BIGINT NOT NULL REFERENCES itam_assets(id) ON DELETE CASCADE,
  warranty_start DATE,
  warranty_end DATE,
  amc_start DATE,
  amc_end DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create asset_maintenance table
CREATE TABLE IF NOT EXISTS asset_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  asset_id BIGINT NOT NULL REFERENCES itam_assets(id) ON DELETE CASCADE,
  issue_description TEXT NOT NULL,
  vendor_id BIGINT REFERENCES itam_vendors(id),
  cost NUMERIC,
  status TEXT DEFAULT 'open',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create asset_contracts table
CREATE TABLE IF NOT EXISTS asset_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  asset_id BIGINT NOT NULL REFERENCES itam_assets(id) ON DELETE CASCADE,
  contract_type TEXT,
  contract_start DATE,
  contract_end DATE,
  vendor_id BIGINT REFERENCES itam_vendors(id),
  cost NUMERIC,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create asset_reservations table
CREATE TABLE IF NOT EXISTS asset_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  asset_id BIGINT NOT NULL REFERENCES itam_assets(id) ON DELETE CASCADE,
  reserved_by UUID NOT NULL,
  reserved_from TIMESTAMP WITH TIME ZONE NOT NULL,
  reserved_to TIMESTAMP WITH TIME ZONE NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create asset_linked_items table
CREATE TABLE IF NOT EXISTS asset_linked_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  asset_id BIGINT NOT NULL REFERENCES itam_assets(id) ON DELETE CASCADE,
  linked_asset_id BIGINT REFERENCES itam_assets(id) ON DELETE CASCADE,
  link_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage bucket for asset photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('asset-photos', 'asset-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for new tables
ALTER TABLE asset_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_linked_items ENABLE ROW LEVEL SECURITY;

-- asset_events policies
CREATE POLICY "tenant_select_asset_events" ON asset_events
FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_insert_asset_events" ON asset_events
FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- asset_photos policies
CREATE POLICY "tenant_select_asset_photos" ON asset_photos
FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_insert_asset_photos" ON asset_photos
FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_update_asset_photos" ON asset_photos
FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_delete_asset_photos" ON asset_photos
FOR DELETE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- asset_documents policies
CREATE POLICY "tenant_select_asset_documents" ON asset_documents
FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_insert_asset_documents" ON asset_documents
FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_delete_asset_documents" ON asset_documents
FOR DELETE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- asset_warranties policies
CREATE POLICY "tenant_select_asset_warranties" ON asset_warranties
FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_insert_asset_warranties" ON asset_warranties
FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_update_asset_warranties" ON asset_warranties
FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- asset_maintenance policies
CREATE POLICY "tenant_select_asset_maintenance" ON asset_maintenance
FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_insert_asset_maintenance" ON asset_maintenance
FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_update_asset_maintenance" ON asset_maintenance
FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- asset_contracts policies
CREATE POLICY "tenant_select_asset_contracts" ON asset_contracts
FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_insert_asset_contracts" ON asset_contracts
FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_update_asset_contracts" ON asset_contracts
FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- asset_reservations policies
CREATE POLICY "tenant_select_asset_reservations" ON asset_reservations
FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_insert_asset_reservations" ON asset_reservations
FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_update_asset_reservations" ON asset_reservations
FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- asset_linked_items policies
CREATE POLICY "tenant_select_asset_linked_items" ON asset_linked_items
FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_insert_asset_linked_items" ON asset_linked_items
FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_delete_asset_linked_items" ON asset_linked_items
FOR DELETE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Storage policies for asset-photos bucket
CREATE POLICY "Users can view asset photos" ON storage.objects
FOR SELECT USING (bucket_id = 'asset-photos' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can upload asset photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'asset-photos' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update asset photos" ON storage.objects
FOR UPDATE USING (bucket_id = 'asset-photos' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete asset photos" ON storage.objects
FOR DELETE USING (bucket_id = 'asset-photos' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid()));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_asset_events_asset_id ON asset_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_events_tenant_id ON asset_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_photos_asset_id ON asset_photos(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_documents_asset_id ON asset_documents(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_warranties_asset_id ON asset_warranties(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_asset_id ON asset_maintenance(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_contracts_asset_id ON asset_contracts(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_reservations_asset_id ON asset_reservations(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_linked_items_asset_id ON asset_linked_items(asset_id);