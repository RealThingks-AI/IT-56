-- Ensure all setup tables exist with proper structure and RLS policies

-- Sites table
CREATE TABLE IF NOT EXISTS public.itam_sites (
  id SERIAL PRIMARY KEY,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.itam_sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sites in their org" ON public.itam_sites;
CREATE POLICY "Users can view sites in their org" ON public.itam_sites
  FOR SELECT USING (
    organisation_id IN (
      SELECT organisation_id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage sites in their org" ON public.itam_sites;
CREATE POLICY "Admins can manage sites in their org" ON public.itam_sites
  FOR ALL USING (
    organisation_id IN (
      SELECT organisation_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'owner', 'editor')
    )
  );

-- Locations table
CREATE TABLE IF NOT EXISTS public.itam_locations (
  id SERIAL PRIMARY KEY,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  site_id INTEGER REFERENCES public.itam_sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.itam_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view locations in their org" ON public.itam_locations;
CREATE POLICY "Users can view locations in their org" ON public.itam_locations
  FOR SELECT USING (
    organisation_id IN (
      SELECT organisation_id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage locations in their org" ON public.itam_locations;
CREATE POLICY "Admins can manage locations in their org" ON public.itam_locations
  FOR ALL USING (
    organisation_id IN (
      SELECT organisation_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'owner', 'editor')
    )
  );

-- Categories table
CREATE TABLE IF NOT EXISTS public.itam_categories (
  id SERIAL PRIMARY KEY,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.itam_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view categories in their org" ON public.itam_categories;
CREATE POLICY "Users can view categories in their org" ON public.itam_categories
  FOR SELECT USING (
    organisation_id IN (
      SELECT organisation_id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage categories in their org" ON public.itam_categories;
CREATE POLICY "Admins can manage categories in their org" ON public.itam_categories
  FOR ALL USING (
    organisation_id IN (
      SELECT organisation_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'owner', 'editor')
    )
  );

-- Departments table
CREATE TABLE IF NOT EXISTS public.itam_departments (
  id SERIAL PRIMARY KEY,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.itam_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view departments in their org" ON public.itam_departments;
CREATE POLICY "Users can view departments in their org" ON public.itam_departments
  FOR SELECT USING (
    organisation_id IN (
      SELECT organisation_id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage departments in their org" ON public.itam_departments;
CREATE POLICY "Admins can manage departments in their org" ON public.itam_departments
  FOR ALL USING (
    organisation_id IN (
      SELECT organisation_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'owner', 'editor')
    )
  );

-- Add updated_at triggers for all tables
CREATE OR REPLACE FUNCTION update_itam_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_itam_sites_updated_at ON public.itam_sites;
CREATE TRIGGER update_itam_sites_updated_at
  BEFORE UPDATE ON public.itam_sites
  FOR EACH ROW EXECUTE FUNCTION update_itam_updated_at();

DROP TRIGGER IF EXISTS update_itam_locations_updated_at ON public.itam_locations;
CREATE TRIGGER update_itam_locations_updated_at
  BEFORE UPDATE ON public.itam_locations
  FOR EACH ROW EXECUTE FUNCTION update_itam_updated_at();

DROP TRIGGER IF EXISTS update_itam_categories_updated_at ON public.itam_categories;
CREATE TRIGGER update_itam_categories_updated_at
  BEFORE UPDATE ON public.itam_categories
  FOR EACH ROW EXECUTE FUNCTION update_itam_updated_at();

DROP TRIGGER IF EXISTS update_itam_departments_updated_at ON public.itam_departments;
CREATE TRIGGER update_itam_departments_updated_at
  BEFORE UPDATE ON public.itam_departments
  FOR EACH ROW EXECUTE FUNCTION update_itam_updated_at();

DROP TRIGGER IF EXISTS update_itam_makes_updated_at ON public.itam_makes;
CREATE TRIGGER update_itam_makes_updated_at
  BEFORE UPDATE ON public.itam_makes
  FOR EACH ROW EXECUTE FUNCTION update_itam_updated_at();