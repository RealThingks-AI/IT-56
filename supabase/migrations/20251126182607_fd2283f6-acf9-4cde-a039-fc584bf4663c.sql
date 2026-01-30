-- ============================================
-- Fix security issues and add comprehensive RLS policies
-- ============================================

-- ============================================
-- STEP 1: Fix existing functions to have search_path set
-- ============================================

-- Fix handle_new_auth_user function
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  org_id UUID;
  is_first_user BOOLEAN;
  account_type TEXT;
  new_user_type public.user_type;
  new_user_id UUID;
BEGIN
  org_id := (NEW.raw_user_meta_data->>'organisation_id')::UUID;
  account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'personal');
  
  -- Special handling for super admin email
  IF NEW.email = 'connect.appmaster@gmail.com' THEN
    new_user_type := 'appmaster_admin'::public.user_type;
  ELSIF account_type = 'personal' THEN
    new_user_type := 'individual'::public.user_type;
  ELSE
    new_user_type := 'organization'::public.user_type;
  END IF;
  
  IF org_id IS NULL THEN
    INSERT INTO public.organisations (name, plan, active_tools, account_type)
    VALUES (
      CASE 
        WHEN account_type = 'personal' THEN COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
        ELSE COALESCE(NEW.raw_user_meta_data->>'organisation_name', 'New Organisation')
      END,
      'free',
      ARRAY['crm'],
      account_type
    )
    RETURNING id INTO org_id;
    
    INSERT INTO public.subscriptions (organisation_id, plan_name, status)
    VALUES (org_id, 'free', 'active');
    
    is_first_user := true;
  ELSE
    is_first_user := false;
  END IF;
  
  INSERT INTO public.users (
    auth_user_id,
    organisation_id,
    name,
    email,
    role,
    status,
    user_type
  ) VALUES (
    NEW.id,
    org_id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    CASE WHEN is_first_user THEN 'admin' ELSE 'employee' END,
    'active',
    new_user_type
  )
  RETURNING id INTO new_user_id;
  
  -- Create appmaster admin record if super admin
  IF NEW.email = 'connect.appmaster@gmail.com' THEN
    INSERT INTO public.appmaster_admins (user_id, admin_role, is_active)
    VALUES (NEW.id, 'super_admin', true)
    ON CONFLICT (user_id) DO UPDATE 
    SET admin_role = 'super_admin', is_active = true;
  END IF;
  
  -- Create user_org_map entry
  INSERT INTO public.user_org_map (user_id, organisation_id, role)
  VALUES (
    NEW.id,
    org_id,
    CASE 
      WHEN NEW.email = 'connect.appmaster@gmail.com' THEN 'super_admin'
      WHEN is_first_user THEN 'org_admin'
      WHEN new_user_type = 'individual'::public.user_type THEN 'individual_user'
      ELSE 'org_user'
    END
  )
  ON CONFLICT (user_id, organisation_id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN is_first_user THEN 'owner'::app_role
      ELSE 'staff'::app_role
    END
  );
  
  INSERT INTO public.audit_logs (organisation_id, action_type, metadata)
  VALUES (
    org_id, 
    'user_signup', 
    jsonb_build_object(
      'email', NEW.email, 
      'is_first_user', is_first_user,
      'account_type', account_type,
      'user_type', new_user_type::text
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_auth_user: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- ============================================
-- STEP 2: Add comprehensive RLS policies for all major tables
-- ============================================

-- Drop existing policies and recreate with strict isolation

-- HELPDESK TICKETS
DROP POLICY IF EXISTS "Users can view tickets in their org" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "Users can update tickets in their org" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON public.helpdesk_tickets;

CREATE POLICY "org_isolation_select_helpdesk_tickets"
ON public.helpdesk_tickets FOR SELECT
USING (
  is_super_admin_user() OR 
  (organisation_id = auth_organisation_id() AND is_deleted = false)
);

CREATE POLICY "org_isolation_insert_helpdesk_tickets"
ON public.helpdesk_tickets FOR INSERT
WITH CHECK (
  organisation_id = auth_organisation_id()
);

CREATE POLICY "org_isolation_update_helpdesk_tickets"
ON public.helpdesk_tickets FOR UPDATE
USING (
  is_super_admin_user() OR 
  organisation_id = auth_organisation_id()
);

CREATE POLICY "org_admin_delete_helpdesk_tickets"
ON public.helpdesk_tickets FOR DELETE
USING (
  is_super_admin_user() OR 
  (organisation_id = auth_organisation_id() AND is_org_admin_user())
);

-- SRM REQUESTS
DROP POLICY IF EXISTS "Users can view service requests" ON public.srm_requests;
DROP POLICY IF EXISTS "Users can create service requests" ON public.srm_requests;
DROP POLICY IF EXISTS "Users can update their service requests" ON public.srm_requests;

CREATE POLICY "org_isolation_select_srm_requests"
ON public.srm_requests FOR SELECT
USING (
  is_super_admin_user() OR 
  (organisation_id = auth_organisation_id() AND is_deleted = false)
);

CREATE POLICY "org_isolation_insert_srm_requests"
ON public.srm_requests FOR INSERT
WITH CHECK (
  organisation_id = auth_organisation_id()
);

CREATE POLICY "org_isolation_update_srm_requests"
ON public.srm_requests FOR UPDATE
USING (
  is_super_admin_user() OR 
  organisation_id = auth_organisation_id()
);

-- ITAM ASSETS
DROP POLICY IF EXISTS "Users can view assets in their org" ON public.itam_assets;
DROP POLICY IF EXISTS "Users can create assets" ON public.itam_assets;
DROP POLICY IF EXISTS "Users can update assets in their org" ON public.itam_assets;
DROP POLICY IF EXISTS "Admins can delete assets" ON public.itam_assets;

CREATE POLICY "org_isolation_select_itam_assets"
ON public.itam_assets FOR SELECT
USING (
  is_super_admin_user() OR 
  (organisation_id = auth_organisation_id() AND is_deleted = false)
);

CREATE POLICY "org_isolation_insert_itam_assets"
ON public.itam_assets FOR INSERT
WITH CHECK (
  organisation_id = auth_organisation_id()
);

CREATE POLICY "org_isolation_update_itam_assets"
ON public.itam_assets FOR UPDATE
USING (
  is_super_admin_user() OR 
  organisation_id = auth_organisation_id()
);

CREATE POLICY "org_admin_delete_itam_assets"
ON public.itam_assets FOR DELETE
USING (
  is_super_admin_user() OR 
  (organisation_id = auth_organisation_id() AND is_org_admin_user())
);

-- ITAM CATEGORIES
DROP POLICY IF EXISTS "Users can view categories in their org" ON public.itam_categories;
DROP POLICY IF EXISTS "Users can insert categories in their org" ON public.itam_categories;
DROP POLICY IF EXISTS "Users can update categories in their org" ON public.itam_categories;
DROP POLICY IF EXISTS "Users can delete categories in their org" ON public.itam_categories;

CREATE POLICY "org_isolation_select_itam_categories"
ON public.itam_categories FOR SELECT
USING (
  is_super_admin_user() OR 
  organisation_id = auth_organisation_id()
);

CREATE POLICY "org_admin_insert_itam_categories"
ON public.itam_categories FOR INSERT
WITH CHECK (
  organisation_id = auth_organisation_id() AND is_org_admin_user()
);

CREATE POLICY "org_admin_update_itam_categories"
ON public.itam_categories FOR UPDATE
USING (
  is_super_admin_user() OR 
  (organisation_id = auth_organisation_id() AND is_org_admin_user())
);

CREATE POLICY "org_admin_delete_itam_categories"
ON public.itam_categories FOR DELETE
USING (
  is_super_admin_user() OR 
  (organisation_id = auth_organisation_id() AND is_org_admin_user())
);

-- ORGANISATIONS
DROP POLICY IF EXISTS "Users can view their own organisation" ON public.organisations;
DROP POLICY IF EXISTS "Super admins can view all organisations" ON public.organisations;
DROP POLICY IF EXISTS "Admins can update their organisation" ON public.organisations;

CREATE POLICY "org_isolation_select_organisations"
ON public.organisations FOR SELECT
USING (
  is_super_admin_user() OR 
  id = auth_organisation_id()
);

CREATE POLICY "org_admin_update_organisations"
ON public.organisations FOR UPDATE
USING (
  is_super_admin_user() OR 
  (id = auth_organisation_id() AND is_org_admin_user())
);

CREATE POLICY "super_admin_insert_organisations"
ON public.organisations FOR INSERT
WITH CHECK (is_super_admin_user());

-- USERS TABLE
DROP POLICY IF EXISTS "Users can view users in their org" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users in their org" ON public.users;
DROP POLICY IF EXISTS "Super admins can view all users" ON public.users;

CREATE POLICY "org_isolation_select_users"
ON public.users FOR SELECT
USING (
  is_super_admin_user() OR 
  organisation_id = auth_organisation_id()
);

CREATE POLICY "org_admin_insert_users"
ON public.users FOR INSERT
WITH CHECK (
  is_super_admin_user() OR 
  (organisation_id = auth_organisation_id() AND is_org_admin_user())
);

CREATE POLICY "org_admin_update_users"
ON public.users FOR UPDATE
USING (
  is_super_admin_user() OR 
  (organisation_id = auth_organisation_id() AND is_org_admin_user())
);

CREATE POLICY "org_admin_delete_users"
ON public.users FOR DELETE
USING (
  is_super_admin_user() OR 
  (organisation_id = auth_organisation_id() AND is_org_admin_user())
);

-- ============================================
-- STEP 3: Create trigger to auto-set created_by and updated_by
-- ============================================

CREATE OR REPLACE FUNCTION public.set_user_tracking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
    NEW.updated_by := auth.uid();
    IF NEW.organisation_id IS NULL THEN
      NEW.organisation_id := auth_organisation_id();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by := auth.uid();
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Apply triggers to key tables
DROP TRIGGER IF EXISTS set_user_tracking_helpdesk_tickets ON public.helpdesk_tickets;
CREATE TRIGGER set_user_tracking_helpdesk_tickets
BEFORE INSERT OR UPDATE ON public.helpdesk_tickets
FOR EACH ROW EXECUTE FUNCTION public.set_user_tracking();

DROP TRIGGER IF EXISTS set_user_tracking_srm_requests ON public.srm_requests;
CREATE TRIGGER set_user_tracking_srm_requests
BEFORE INSERT OR UPDATE ON public.srm_requests
FOR EACH ROW EXECUTE FUNCTION public.set_user_tracking();

DROP TRIGGER IF EXISTS set_user_tracking_itam_assets ON public.itam_assets;
CREATE TRIGGER set_user_tracking_itam_assets
BEFORE INSERT OR UPDATE ON public.itam_assets
FOR EACH ROW EXECUTE FUNCTION public.set_user_tracking();

DROP TRIGGER IF EXISTS set_user_tracking_change_requests ON public.change_requests;
CREATE TRIGGER set_user_tracking_change_requests
BEFORE INSERT OR UPDATE ON public.change_requests
FOR EACH ROW EXECUTE FUNCTION public.set_user_tracking();