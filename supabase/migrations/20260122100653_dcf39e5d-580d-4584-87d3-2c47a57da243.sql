-- Create a secure function to update user roles (only admins can update)
CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id uuid,
  new_role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role app_role;
BEGIN
  -- Get the caller's role
  SELECT role INTO caller_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY 
    CASE role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'manager' THEN 3 
      WHEN 'staff' THEN 4
      WHEN 'viewer' THEN 5
    END
  LIMIT 1;
  
  -- Only owners and admins can update roles
  IF caller_role IS NULL OR caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to update user roles';
  END IF;
  
  -- Prevent non-owners from assigning owner role
  IF new_role = 'owner' AND caller_role != 'owner' THEN
    RAISE EXCEPTION 'Only owners can assign the owner role';
  END IF;
  
  -- Upsert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id, role) 
  DO UPDATE SET role = new_role;
  
  -- Remove any other roles for this user (ensure single role)
  DELETE FROM public.user_roles 
  WHERE user_id = target_user_id 
    AND role != new_role;
END;
$$;

-- Create a function to update user status (for admin use)
CREATE OR REPLACE FUNCTION public.update_user_status(
  target_user_id uuid,
  new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role app_role;
BEGIN
  -- Get the caller's role
  SELECT role INTO caller_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY 
    CASE role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'manager' THEN 3 
      WHEN 'staff' THEN 4
      WHEN 'viewer' THEN 5
    END
  LIMIT 1;
  
  -- Only owners and admins can update status
  IF caller_role IS NULL OR caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to update user status';
  END IF;
  
  -- Update the user status
  UPDATE public.users
  SET status = new_status, updated_at = NOW()
  WHERE auth_user_id = target_user_id;
END;
$$;