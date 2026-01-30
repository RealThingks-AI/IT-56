-- Step 1: Create or replace get_user_org function (safer version)
CREATE OR REPLACE FUNCTION public.get_user_org()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organisation_id INTO org_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN org_id;
END;
$$;

-- Step 1b: Create get_user_tenant helper function
CREATE OR REPLACE FUNCTION public.get_user_tenant()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  t_id bigint;
BEGIN
  SELECT tenant_id INTO t_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  IF t_id IS NULL THEN
    t_id := 1;
  END IF;
  
  RETURN t_id;
END;
$$;

-- Step 2: Update the RLS Policy on itam_assets
DROP POLICY IF EXISTS "org_isolation_itam_assets" ON public.itam_assets;

CREATE POLICY "org_isolation_itam_assets" ON public.itam_assets
  FOR ALL
  USING (
    organisation_id = get_user_org() 
    OR 
    tenant_id = get_user_tenant()
  );

-- Step 3: Insert missing profiles for existing users
INSERT INTO public.profiles (id, tenant_id, is_active, created_at, updated_at)
SELECT 
  auth_user_id,
  1,
  true,
  now(),
  now()
FROM public.users 
WHERE auth_user_id IS NOT NULL
  AND auth_user_id NOT IN (SELECT id FROM public.profiles WHERE id IS NOT NULL)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Create trigger function to auto-create profile
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.auth_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, tenant_id, full_name, is_active, created_at, updated_at)
    VALUES (
      NEW.auth_user_id,
      1,
      NEW.name,
      true,
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 4b: Create trigger on users table
DROP TRIGGER IF EXISTS auto_create_profile ON public.users;
CREATE TRIGGER auto_create_profile
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_for_new_user();