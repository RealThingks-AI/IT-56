-- First, create a default tenant if none exists (let ID auto-generate)
INSERT INTO public.tenants (name)
SELECT 'Default Tenant'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants LIMIT 1);

-- Get the first tenant ID to use
DO $$
DECLARE
  auth_user RECORD;
  new_org_id UUID;
  account_type_val TEXT;
  default_tenant_id BIGINT;
BEGIN
  -- Get first tenant ID
  SELECT id INTO default_tenant_id FROM public.tenants LIMIT 1;
  
  -- If still no tenant, create one
  IF default_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name) VALUES ('Default Tenant') RETURNING id INTO default_tenant_id;
  END IF;
  
  FOR auth_user IN 
    SELECT 
      au.id,
      au.email,
      au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.users u ON u.auth_user_id = au.id
    WHERE u.id IS NULL
  LOOP
    account_type_val := COALESCE(auth_user.raw_user_meta_data->>'account_type', 'personal');
    
    -- Create organisation
    INSERT INTO public.organisations (name, plan, active_tools, account_type)
    VALUES (
      CASE 
        WHEN account_type_val = 'personal' THEN COALESCE(auth_user.raw_user_meta_data->>'name', auth_user.email)
        ELSE COALESCE(auth_user.raw_user_meta_data->>'organisation_name', 'New Organisation')
      END,
      'free',
      ARRAY['crm'],
      account_type_val
    )
    RETURNING id INTO new_org_id;
    
    -- Create subscription
    INSERT INTO public.subscriptions (organisation_id, plan_name, status)
    VALUES (new_org_id, 'free', 'active');
    
    -- Create user
    INSERT INTO public.users (
      auth_user_id,
      organisation_id,
      name,
      email,
      role,
      status,
      user_type
    ) VALUES (
      auth_user.id,
      new_org_id,
      COALESCE(auth_user.raw_user_meta_data->>'name', auth_user.email),
      auth_user.email,
      'admin',
      'active',
      CASE 
        WHEN auth_user.email = 'connect.appmaster@gmail.com' THEN 'appmaster_admin'::user_type
        WHEN account_type_val = 'personal' THEN 'individual'::user_type
        ELSE 'organization'::user_type
      END
    );
    
    -- Create profile
    INSERT INTO public.profiles (id, tenant_id, selected_tools, full_name)
    VALUES (
      auth_user.id,
      default_tenant_id,
      ARRAY[]::text[],
      COALESCE(auth_user.raw_user_meta_data->>'name', auth_user.email)
    );
    
    -- Create appmaster admin if needed
    IF auth_user.email = 'connect.appmaster@gmail.com' THEN
      INSERT INTO public.appmaster_admins (user_id, admin_role, is_active)
      VALUES (auth_user.id, 'super_admin', true)
      ON CONFLICT (user_id) DO UPDATE 
      SET admin_role = 'super_admin', is_active = true;
    END IF;
  END LOOP;
END $$;

-- Set up the signup trigger for future users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();