-- Step 1: Add user_type enum and column to users table
CREATE TYPE public.user_type AS ENUM ('individual', 'organization', 'appmaster_admin');

ALTER TABLE public.users 
ADD COLUMN user_type public.user_type DEFAULT 'organization';

-- Step 2: Create appmaster_admins table
CREATE TABLE public.appmaster_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_role TEXT NOT NULL CHECK (admin_role IN ('super_admin', 'admin', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  permissions JSONB DEFAULT '[]'::jsonb,
  UNIQUE(user_id)
);

-- Step 3: Create views for separate user types
CREATE VIEW public.individual_users AS
SELECT u.*, o.name as account_name
FROM public.users u
LEFT JOIN public.organisations o ON u.organisation_id = o.id
WHERE u.user_type = 'individual' AND o.account_type = 'personal';

CREATE VIEW public.organization_users AS
SELECT u.*, o.name as organisation_name, o.account_type
FROM public.users u
LEFT JOIN public.organisations o ON u.organisation_id = o.id
WHERE u.user_type = 'organization' AND o.account_type = 'organization';

-- Step 4: Migrate existing super_admin_users to appmaster_admins
INSERT INTO public.appmaster_admins (user_id, admin_role, is_active, created_at)
SELECT user_id, 
       CASE 
         WHEN role = 'super_admin' THEN 'super_admin'
         ELSE 'admin'
       END,
       is_active,
       created_at
FROM public.super_admin_users;

-- Step 5: Update existing users' user_type based on their organisation
UPDATE public.users u
SET user_type = (CASE 
  WHEN EXISTS (SELECT 1 FROM public.appmaster_admins WHERE user_id = u.auth_user_id) THEN 'appmaster_admin'
  WHEN EXISTS (SELECT 1 FROM public.organisations o WHERE o.id = u.organisation_id AND o.account_type = 'personal') THEN 'individual'
  ELSE 'organization'
END)::public.user_type;

-- Step 6: Update handle_new_auth_user function
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  org_id UUID;
  is_first_user BOOLEAN;
  account_type TEXT;
  new_user_type public.user_type;
BEGIN
  org_id := (NEW.raw_user_meta_data->>'organisation_id')::UUID;
  account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'personal');
  
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
  );
  
  IF NEW.email = 'connect.appmaster@gmail.com' THEN
    INSERT INTO public.appmaster_admins (user_id, admin_role, is_active)
    VALUES (NEW.id, 'super_admin', true);
  END IF;
  
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
$$;

-- Step 7: Enable RLS on appmaster_admins
ALTER TABLE public.appmaster_admins ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for appmaster_admins
CREATE POLICY "Only appmaster admins can view appmaster_admins"
ON public.appmaster_admins
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appmaster_admins
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Only super admins can manage appmaster_admins"
ON public.appmaster_admins
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.appmaster_admins
    WHERE user_id = auth.uid() AND admin_role = 'super_admin' AND is_active = true
  )
);

-- Step 9: Update is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appmaster_admins
    WHERE user_id = _user_id
      AND is_active = true
      AND admin_role IN ('super_admin', 'admin')
  );
$$;

-- Step 10: Create helper functions
CREATE OR REPLACE FUNCTION public.is_appmaster_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appmaster_admins
    WHERE user_id = _user_id AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_appmaster_role(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT admin_role
  FROM public.appmaster_admins
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1;
$$;

-- Step 11: Create indexes (skip if exists)
CREATE INDEX IF NOT EXISTS idx_users_user_type ON public.users(user_type);
CREATE INDEX IF NOT EXISTS idx_appmaster_admins_user_id ON public.appmaster_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_appmaster_admins_role ON public.appmaster_admins(admin_role);

-- Step 12: Add trigger for updated_at
CREATE TRIGGER update_appmaster_admins_updated_at
  BEFORE UPDATE ON public.appmaster_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_timestamp();