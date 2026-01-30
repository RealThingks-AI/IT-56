-- ============================================
-- STEP 1: Create user_org_map table for role-based access
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_org_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'org_admin', 'org_user', 'individual_user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organisation_id)
);

CREATE INDEX idx_user_org_map_user ON public.user_org_map(user_id);
CREATE INDEX idx_user_org_map_org ON public.user_org_map(organisation_id);

ALTER TABLE public.user_org_map ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Create security definer functions
-- ============================================

-- Function to get current user's organisation_id
CREATE OR REPLACE FUNCTION public.auth_organisation_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organisation_id 
  FROM public.users 
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_org_map 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  );
$$;

-- Function to check if user is org admin
CREATE OR REPLACE FUNCTION public.is_org_admin_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_org_map 
    WHERE user_id = auth.uid() 
    AND role IN ('org_admin', 'super_admin')
  );
$$;

-- Function to check if user has access to organisation
CREATE OR REPLACE FUNCTION public.has_org_access(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_org_map 
    WHERE user_id = auth.uid() 
    AND organisation_id = _org_id
  ) OR is_super_admin_user();
$$;

-- Function to get user's role in organisation
CREATE OR REPLACE FUNCTION public.get_user_org_role(_org_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role 
  FROM public.user_org_map 
  WHERE user_id = auth.uid() 
  AND organisation_id = _org_id
  LIMIT 1;
$$;

-- ============================================
-- STEP 3: Add missing columns to critical tables
-- ============================================

-- Add created_by and updated_by to tables that don't have them
ALTER TABLE public.helpdesk_tickets 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.srm_requests 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.change_requests 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.helpdesk_problems
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.itam_assets
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- ============================================
-- STEP 4: Create RLS policies for user_org_map
-- ============================================

-- Users can view their own org mappings
CREATE POLICY "Users can view their org mappings"
ON public.user_org_map
FOR SELECT
USING (user_id = auth.uid() OR is_super_admin_user());

-- Only super admins and org admins can insert
CREATE POLICY "Admins can insert org mappings"
ON public.user_org_map
FOR INSERT
WITH CHECK (is_super_admin_user() OR is_org_admin_user());

-- Only super admins and org admins can update
CREATE POLICY "Admins can update org mappings"
ON public.user_org_map
FOR UPDATE
USING (is_super_admin_user() OR (is_org_admin_user() AND organisation_id = auth_organisation_id()));

-- Only super admins can delete
CREATE POLICY "Super admins can delete org mappings"
ON public.user_org_map
FOR DELETE
USING (is_super_admin_user());

-- ============================================
-- STEP 5: Migrate existing users to user_org_map
-- ============================================

-- Migrate existing users to user_org_map table
INSERT INTO public.user_org_map (user_id, organisation_id, role)
SELECT 
  auth_user_id,
  organisation_id,
  CASE 
    WHEN role = 'owner' THEN 'org_admin'
    WHEN role = 'admin' THEN 'org_admin'
    WHEN user_type = 'individual' THEN 'individual_user'
    ELSE 'org_user'
  END as mapped_role
FROM public.users
WHERE auth_user_id IS NOT NULL 
  AND organisation_id IS NOT NULL
ON CONFLICT (user_id, organisation_id) DO NOTHING;

-- Migrate super admins from appmaster_admins
INSERT INTO public.user_org_map (user_id, organisation_id, role)
SELECT 
  aa.user_id,
  u.organisation_id,
  'super_admin'
FROM public.appmaster_admins aa
JOIN public.users u ON u.auth_user_id = aa.user_id
WHERE aa.is_active = true
  AND u.organisation_id IS NOT NULL
ON CONFLICT (user_id, organisation_id) DO NOTHING;

-- ============================================
-- STEP 6: Update trigger for user_org_map
-- ============================================

CREATE OR REPLACE FUNCTION public.update_user_org_map_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_org_map_updated_at
BEFORE UPDATE ON public.user_org_map
FOR EACH ROW
EXECUTE FUNCTION public.update_user_org_map_timestamp();