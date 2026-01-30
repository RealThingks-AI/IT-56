-- First, drop tables if they exist (to start fresh)
DROP TABLE IF EXISTS srm_comments CASCADE;
DROP TABLE IF EXISTS srm_requests CASCADE;
DROP TABLE IF EXISTS srm_catalog CASCADE;

-- Create SRM Catalog table
CREATE TABLE srm_catalog (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  estimated_fulfillment_time TEXT,
  form_fields JSONB DEFAULT '[]'::jsonb,
  organisation_id UUID,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create SRM Requests table  
CREATE TABLE srm_requests (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  request_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  catalog_item_id BIGINT REFERENCES srm_catalog(id),
  requester_id UUID,
  assigned_to UUID,
  organisation_id UUID,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  form_data JSONB DEFAULT '{}'::jsonb,
  attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
  additional_notes TEXT,
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create SRM Comments table
CREATE TABLE srm_comments (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  request_id BIGINT NOT NULL REFERENCES srm_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_srm_requests_requester ON srm_requests(requester_id);
CREATE INDEX idx_srm_requests_status ON srm_requests(status);
CREATE INDEX idx_srm_requests_org ON srm_requests(organisation_id);
CREATE INDEX idx_srm_requests_tenant ON srm_requests(tenant_id);
CREATE INDEX idx_srm_requests_deleted ON srm_requests(is_deleted);
CREATE INDEX idx_srm_catalog_org ON srm_catalog(organisation_id);
CREATE INDEX idx_srm_catalog_tenant ON srm_catalog(tenant_id);
CREATE INDEX idx_srm_catalog_active ON srm_catalog(is_active);
CREATE INDEX idx_srm_comments_request ON srm_comments(request_id);

-- Enable RLS
ALTER TABLE srm_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for srm_catalog
CREATE POLICY "Users can view active catalog items in their org"
  ON srm_catalog FOR SELECT
  USING (
    is_active = true AND (
      organisation_id IN (SELECT get_user_org()) OR
      tenant_id IN (SELECT get_user_tenant(auth.uid()))
    )
  );

CREATE POLICY "Admins can manage catalog items"
  ON srm_catalog FOR ALL
  USING (
    (organisation_id IN (SELECT get_user_org()) OR tenant_id IN (SELECT get_user_tenant(auth.uid())))
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'owner', 'editor')
    )
  );

-- RLS Policies for srm_requests
CREATE POLICY "Users can view requests in their org"
  ON srm_requests FOR SELECT
  USING (
    is_deleted = false AND (
      organisation_id IN (SELECT get_user_org()) OR
      tenant_id IN (SELECT get_user_tenant(auth.uid()))
    )
  );

CREATE POLICY "Users can create requests"
  ON srm_requests FOR INSERT
  WITH CHECK (
    organisation_id IN (SELECT get_user_org()) OR
    tenant_id IN (SELECT get_user_tenant(auth.uid()))
  );

CREATE POLICY "Users can update their own requests"
  ON srm_requests FOR UPDATE
  USING (
    is_deleted = false AND (
      requester_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()) OR
      assigned_to = auth.uid() OR
      EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_user_id = auth.uid()
        AND users.role IN ('admin', 'owner', 'editor')
      )
    )
  );

-- RLS Policies for srm_comments
CREATE POLICY "Users can view comments on requests they can see"
  ON srm_comments FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM srm_requests
      WHERE organisation_id IN (SELECT get_user_org()) 
        OR tenant_id IN (SELECT get_user_tenant(auth.uid()))
    )
  );

CREATE POLICY "Users can add comments to requests"
  ON srm_comments FOR INSERT
  WITH CHECK (
    request_id IN (
      SELECT id FROM srm_requests
      WHERE organisation_id IN (SELECT get_user_org()) 
        OR tenant_id IN (SELECT get_user_tenant(auth.uid()))
    )
  );

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_srm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_srm_catalog_updated_at
  BEFORE UPDATE ON srm_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_srm_updated_at();

CREATE TRIGGER update_srm_requests_updated_at
  BEFORE UPDATE ON srm_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_srm_updated_at();