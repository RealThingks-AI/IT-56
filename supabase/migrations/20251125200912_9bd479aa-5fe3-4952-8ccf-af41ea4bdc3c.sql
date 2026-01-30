-- Create asset setup configuration tables

-- Company Information
CREATE TABLE IF NOT EXISTS public.itam_company_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id),
  organisation_id UUID REFERENCES public.organisations(id),
  company_name TEXT NOT NULL,
  company_code TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, organisation_id)
);

-- Sites
CREATE TABLE IF NOT EXISTS public.itam_sites (
  id SERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id),
  organisation_id UUID REFERENCES public.organisations(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations
CREATE TABLE IF NOT EXISTS public.itam_locations (
  id SERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id),
  organisation_id UUID REFERENCES public.organisations(id),
  site_id INTEGER REFERENCES public.itam_sites(id),
  name TEXT NOT NULL,
  floor TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS public.itam_categories (
  id SERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id),
  organisation_id UUID REFERENCES public.organisations(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments
CREATE TABLE IF NOT EXISTS public.itam_departments (
  id SERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id),
  organisation_id UUID REFERENCES public.organisations(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asset Tag Format Configuration
CREATE TABLE IF NOT EXISTS public.itam_tag_format (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id),
  organisation_id UUID REFERENCES public.organisations(id),
  prefix TEXT NOT NULL DEFAULT 'AST-',
  start_number TEXT NOT NULL DEFAULT '0001',
  current_number INTEGER DEFAULT 1,
  auto_increment BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, organisation_id)
);

-- Enable RLS
ALTER TABLE public.itam_company_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itam_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itam_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itam_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itam_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itam_tag_format ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organisation users
CREATE POLICY "Users can view their org company info"
  ON public.itam_company_info FOR SELECT
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can manage their org company info"
  ON public.itam_company_info FOR ALL
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can view their org sites"
  ON public.itam_sites FOR SELECT
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can manage their org sites"
  ON public.itam_sites FOR ALL
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can view their org locations"
  ON public.itam_locations FOR SELECT
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can manage their org locations"
  ON public.itam_locations FOR ALL
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can view their org categories"
  ON public.itam_categories FOR SELECT
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can manage their org categories"
  ON public.itam_categories FOR ALL
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can view their org departments"
  ON public.itam_departments FOR SELECT
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can manage their org departments"
  ON public.itam_departments FOR ALL
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can view their org tag format"
  ON public.itam_tag_format FOR SELECT
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can manage their org tag format"
  ON public.itam_tag_format FOR ALL
  USING (organisation_id = get_user_org());

-- Triggers for updated_at
CREATE TRIGGER update_itam_company_info_updated_at
  BEFORE UPDATE ON public.itam_company_info
  FOR EACH ROW EXECUTE FUNCTION update_itam_updated_at();

CREATE TRIGGER update_itam_sites_updated_at
  BEFORE UPDATE ON public.itam_sites
  FOR EACH ROW EXECUTE FUNCTION update_itam_updated_at();

CREATE TRIGGER update_itam_locations_updated_at
  BEFORE UPDATE ON public.itam_locations
  FOR EACH ROW EXECUTE FUNCTION update_itam_updated_at();

CREATE TRIGGER update_itam_categories_updated_at
  BEFORE UPDATE ON public.itam_categories
  FOR EACH ROW EXECUTE FUNCTION update_itam_updated_at();

CREATE TRIGGER update_itam_departments_updated_at
  BEFORE UPDATE ON public.itam_departments
  FOR EACH ROW EXECUTE FUNCTION update_itam_updated_at();

CREATE TRIGGER update_itam_tag_format_updated_at
  BEFORE UPDATE ON public.itam_tag_format
  FOR EACH ROW EXECUTE FUNCTION update_itam_updated_at();