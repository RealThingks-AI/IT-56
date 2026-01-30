-- ===========================================
-- PHASE 1: Drop dependent objects first
-- ===========================================

-- Drop dependent functions
DROP FUNCTION IF EXISTS public.has_any_role(uuid, app_role[]) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_role(uuid, app_role) CASCADE;

-- Drop policies that depend on app_role
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- ===========================================
-- PHASE 2: Fix Role System (4 roles: admin, manager, user, viewer)
-- ===========================================

-- Create new role enum
CREATE TYPE public.app_role_v2 AS ENUM ('admin', 'manager', 'user', 'viewer');

-- Add new column with new type
ALTER TABLE public.user_roles ADD COLUMN role_v2 public.app_role_v2;

-- Migrate existing roles
UPDATE public.user_roles SET role_v2 = 
  CASE 
    WHEN role::text = 'owner' THEN 'admin'::public.app_role_v2
    WHEN role::text = 'admin' THEN 'admin'::public.app_role_v2
    WHEN role::text = 'manager' THEN 'manager'::public.app_role_v2
    WHEN role::text = 'staff' THEN 'user'::public.app_role_v2
    WHEN role::text = 'viewer' THEN 'viewer'::public.app_role_v2
    ELSE 'user'::public.app_role_v2
  END;

-- Drop old column and rename new one
ALTER TABLE public.user_roles DROP COLUMN role;
ALTER TABLE public.user_roles RENAME COLUMN role_v2 TO role;
ALTER TABLE public.user_roles ALTER COLUMN role SET NOT NULL;

-- Drop old enum type
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Rename new enum
ALTER TYPE public.app_role_v2 RENAME TO app_role;

-- ===========================================
-- PHASE 3: Recreate functions with new role type
-- ===========================================

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- has_any_role function
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- update_user_role function (accepts text to be flexible)
CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  valid_roles text[] := ARRAY['admin', 'manager', 'user', 'viewer'];
BEGIN
  -- Get caller's role
  SELECT role::text INTO caller_role 
  FROM public.user_roles 
  WHERE user_id = auth.uid();
  
  -- Only admins can update roles
  IF caller_role IS NULL OR caller_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can update user roles';
  END IF;
  
  -- Validate new role
  IF NOT (new_role = ANY(valid_roles)) THEN
    RAISE EXCEPTION 'Invalid role: %. Valid roles are: admin, manager, user, viewer', new_role;
  END IF;
  
  -- Update or insert the role
  UPDATE public.user_roles 
  SET role = new_role::public.app_role
  WHERE user_id = target_user_id;
  
  -- If no row was updated, insert a new one
  IF NOT FOUND THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, new_role::public.app_role);
  END IF;
END;
$$;

-- ===========================================
-- PHASE 4: Recreate RLS policies for user_roles
-- ===========================================

CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ===========================================
-- PHASE 5: Update handle_new_auth_user trigger
-- ===========================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id uuid;
  initial_role text;
  user_count int;
BEGIN
  -- Get organisation_id from metadata if provided
  org_id := (NEW.raw_user_meta_data->>'organisation_id')::uuid;
  
  -- Get initial role from metadata, default to 'user'
  initial_role := COALESCE(NEW.raw_user_meta_data->>'initial_role', 'user');
  
  -- Map old roles to new roles if needed
  initial_role := CASE 
    WHEN initial_role = 'owner' THEN 'admin'
    WHEN initial_role = 'staff' THEN 'user'
    WHEN initial_role IN ('admin', 'manager', 'user', 'viewer') THEN initial_role
    ELSE 'user'
  END;
  
  -- If no org_id, create a new org for this user
  IF org_id IS NULL THEN
    SELECT COUNT(*) INTO user_count FROM public.users;
    
    INSERT INTO public.organisations (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'company', 'My Organization'))
    RETURNING id INTO org_id;
    
    -- First user becomes admin
    IF user_count = 0 THEN
      initial_role := 'admin';
    END IF;
  END IF;
  
  -- Insert user profile
  INSERT INTO public.users (
    auth_user_id,
    email,
    name,
    organisation_id,
    status,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    org_id,
    'active',
    initial_role
  );
  
  -- Insert into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, initial_role::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- ===========================================
-- PHASE 6: Create page_access_control table
-- ===========================================

CREATE TABLE IF NOT EXISTS public.page_access_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE,
  route text NOT NULL,
  page_name text NOT NULL,
  description text,
  admin_access boolean DEFAULT true,
  manager_access boolean DEFAULT true,
  user_access boolean DEFAULT false,
  viewer_access boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organisation_id, route)
);

ALTER TABLE public.page_access_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view page access for their org" 
ON public.page_access_control 
FOR SELECT 
TO authenticated
USING (
  organisation_id IN (
    SELECT organisation_id FROM public.users WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage page access" 
ON public.page_access_control 
FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Function to check page access
CREATE OR REPLACE FUNCTION public.check_page_access(_route text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  user_org_id uuid;
  has_access boolean;
BEGIN
  SELECT role::text INTO user_role FROM public.user_roles WHERE user_id = auth.uid();
  SELECT organisation_id INTO user_org_id FROM public.users WHERE auth_user_id = auth.uid();
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  SELECT 
    CASE user_role
      WHEN 'manager' THEN manager_access
      WHEN 'user' THEN user_access
      WHEN 'viewer' THEN viewer_access
      ELSE FALSE
    END INTO has_access
  FROM public.page_access_control
  WHERE organisation_id = user_org_id AND route = _route;
  
  IF has_access IS NULL THEN
    RETURN user_role IN ('admin', 'manager');
  END IF;
  
  RETURN has_access;
END;
$$;

-- ===========================================
-- PHASE 7: Create backup system tables
-- ===========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('system-backups', 'system-backups', false, 104857600, ARRAY['application/json', 'application/zip'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can manage backup storage"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'system-backups' 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE TABLE IF NOT EXISTS public.system_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE,
  backup_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  backup_type text DEFAULT 'scheduled' CHECK (backup_type IN ('scheduled', 'manual')),
  tables_included text[],
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view backups for their org"
ON public.system_backups
FOR SELECT
TO authenticated
USING (
  organisation_id IN (
    SELECT organisation_id FROM public.users WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage backups"
ON public.system_backups
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.backup_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE UNIQUE,
  enabled boolean DEFAULT false,
  frequency_days integer DEFAULT 3 CHECK (frequency_days >= 1 AND frequency_days <= 30),
  retention_count integer DEFAULT 20 CHECK (retention_count >= 1 AND retention_count <= 100),
  last_backup_at timestamptz,
  next_backup_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.backup_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view backup schedule for their org"
ON public.backup_schedules
FOR SELECT
TO authenticated
USING (
  organisation_id IN (
    SELECT organisation_id FROM public.users WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage backup schedules"
ON public.backup_schedules
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Function to clean old backups
CREATE OR REPLACE FUNCTION public.cleanup_old_backups(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  retention_limit integer;
  old_backup record;
BEGIN
  SELECT retention_count INTO retention_limit
  FROM public.backup_schedules
  WHERE organisation_id = _org_id;
  
  IF retention_limit IS NULL THEN
    retention_limit := 20;
  END IF;
  
  FOR old_backup IN
    SELECT id, file_path
    FROM public.system_backups
    WHERE organisation_id = _org_id
      AND status = 'completed'
    ORDER BY created_at DESC
    OFFSET retention_limit
  LOOP
    DELETE FROM storage.objects WHERE name = old_backup.file_path AND bucket_id = 'system-backups';
    DELETE FROM public.system_backups WHERE id = old_backup.id;
  END LOOP;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_page_access(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_backups(uuid) TO authenticated;