-- Update check_page_access function to support subpage inheritance
-- and always allow /account, /notifications, /profile

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
  parent_route text;
BEGIN
  -- Always allow /account, /notifications, and /profile for all authenticated users
  IF _route IN ('/account', '/notifications', '/profile') THEN
    RETURN TRUE;
  END IF;

  -- Get user role and org
  SELECT role::text INTO user_role FROM public.user_roles WHERE user_id = auth.uid();
  SELECT organisation_id INTO user_org_id FROM public.users WHERE auth_user_id = auth.uid();
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Admins always have full access
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check exact route first
  SELECT 
    CASE user_role
      WHEN 'manager' THEN manager_access
      WHEN 'user' THEN user_access
      WHEN 'viewer' THEN viewer_access
      ELSE FALSE
    END INTO has_access
  FROM public.page_access_control
  WHERE organisation_id = user_org_id AND route = _route;
  
  -- If exact match found, return it
  IF has_access IS NOT NULL THEN
    RETURN has_access;
  END IF;
  
  -- Check parent route for subpage inheritance
  -- Extract parent (e.g., /assets/licenses -> /assets, /tickets/123 -> /tickets)
  IF _route LIKE '/%/%' THEN
    parent_route := '/' || split_part(substring(_route from 2), '/', 1);
    
    SELECT 
      CASE user_role
        WHEN 'manager' THEN manager_access
        WHEN 'user' THEN user_access
        WHEN 'viewer' THEN viewer_access
        ELSE FALSE
      END INTO has_access
    FROM public.page_access_control
    WHERE organisation_id = user_org_id AND route = parent_route;
    
    IF has_access IS NOT NULL THEN
      RETURN has_access;
    END IF;
  END IF;
  
  -- Default: allow for managers, deny for others
  RETURN user_role = 'manager';
END;
$$;

-- Clean up obsolete page access entries (these are now inherited or always-allowed)
DELETE FROM public.page_access_control 
WHERE route IN ('/automation', '/changes', '/profile', '/queues', '/sla', '/account', '/notifications');