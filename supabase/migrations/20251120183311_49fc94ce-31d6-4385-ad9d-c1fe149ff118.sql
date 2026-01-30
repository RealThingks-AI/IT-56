-- Clean up orphaned admin records
DELETE FROM appmaster_admins 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Ensure the trigger function properly sets up super admin
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
  new_user_type public.user_type;
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
  );
  
  -- Create appmaster admin record FIRST, before user_roles
  IF NEW.email = 'connect.appmaster@gmail.com' THEN
    INSERT INTO public.appmaster_admins (user_id, admin_role, is_active)
    VALUES (NEW.id, 'super_admin', true)
    ON CONFLICT (user_id) DO UPDATE 
    SET admin_role = 'super_admin', is_active = true;
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