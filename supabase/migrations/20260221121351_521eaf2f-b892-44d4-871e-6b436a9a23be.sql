
-- Fix 1: itam_vendors has RLS enabled but no policies
CREATE POLICY "auth_all" ON public.itam_vendors
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Fix 2: handle_new_auth_user trigger references non-existent organisations table
-- Rewrite it to work without organisations
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  initial_role text;
  user_count int;
BEGIN
  -- Get initial role from metadata, default to 'user'
  initial_role := COALESCE(NEW.raw_user_meta_data->>'initial_role', 'user');
  
  -- Map old roles to new roles if needed
  initial_role := CASE 
    WHEN initial_role = 'owner' THEN 'admin'
    WHEN initial_role = 'staff' THEN 'user'
    WHEN initial_role IN ('admin', 'manager', 'user', 'viewer') THEN initial_role
    ELSE 'user'
  END;
  
  -- First user becomes admin
  SELECT COUNT(*) INTO user_count FROM public.users;
  IF user_count = 0 THEN
    initial_role := 'admin';
  END IF;
  
  -- Insert user profile (no organisation_id - column doesn't exist)
  INSERT INTO public.users (
    auth_user_id,
    email,
    name,
    status,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    'active',
    initial_role
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  
  -- Insert into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, initial_role::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;
