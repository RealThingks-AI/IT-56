-- Step 1: Add account type to organisations table
ALTER TABLE public.organisations 
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'organization' 
CHECK (account_type IN ('personal', 'organization'));

-- Step 2: Drop and recreate the user_roles table cleanly
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Step 3: Recreate app_role enum
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'manager', 'staff', 'viewer');

-- Step 4: Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id BIGINT,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Step 5: Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 6: Create has_role function AFTER table exists
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
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

-- Step 7: Create has_any_role function
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE SQL
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

-- Step 8: Create RLS policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles in their org"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u1
    WHERE u1.auth_user_id = auth.uid()
      AND u1.organisation_id IN (
        SELECT u2.organisation_id
        FROM public.users u2
        WHERE u2.auth_user_id = user_roles.user_id
      )
      AND has_any_role(auth.uid(), ARRAY['owner'::app_role, 'admin'::app_role])
  )
);

-- Step 9: Update handle_new_auth_user function
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
  is_first_user BOOLEAN;
  account_type TEXT;
BEGIN
  org_id := (NEW.raw_user_meta_data->>'organisation_id')::UUID;
  account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'personal');
  
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
    status
  ) VALUES (
    NEW.id,
    org_id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    CASE WHEN is_first_user THEN 'admin' ELSE 'employee' END,
    'active'
  );
  
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
      'account_type', account_type
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_auth_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 10: Helper functions for account type
CREATE OR REPLACE FUNCTION public.get_user_account_type()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.account_type
  FROM public.organisations o
  JOIN public.users u ON u.organisation_id = o.id
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.verify_account_type(_email TEXT, _account_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_type TEXT;
BEGIN
  SELECT o.account_type INTO user_org_type
  FROM public.organisations o
  JOIN public.users u ON u.organisation_id = o.id
  WHERE u.email = _email
  LIMIT 1;
  
  RETURN user_org_type = _account_type;
END;
$$;