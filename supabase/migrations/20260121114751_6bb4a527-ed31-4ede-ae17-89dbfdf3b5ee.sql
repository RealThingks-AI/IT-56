-- Create user_roles table (enum already exists with values: owner, admin, manager, staff, viewer)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create or replace function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'manager' THEN 3 
      WHEN 'staff' THEN 4
      WHEN 'viewer' THEN 5
    END
  LIMIT 1
$$;

-- RLS Policies for user_roles table
CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Migrate only users that exist in auth.users - checking admin role
INSERT INTO public.user_roles (user_id, role)
SELECT u.auth_user_id, 'admin'::app_role
FROM public.users u
INNER JOIN auth.users a ON u.auth_user_id = a.id
WHERE u.role = 'admin' AND u.auth_user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Migrate manager users
INSERT INTO public.user_roles (user_id, role)
SELECT u.auth_user_id, 'manager'::app_role
FROM public.users u
INNER JOIN auth.users a ON u.auth_user_id = a.id
WHERE u.role = 'manager' AND u.auth_user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Migrate staff/employee/user users
INSERT INTO public.user_roles (user_id, role)
SELECT u.auth_user_id, 'staff'::app_role
FROM public.users u
INNER JOIN auth.users a ON u.auth_user_id = a.id
WHERE (u.role IN ('user', 'staff', 'employee') OR u.role IS NULL) AND u.auth_user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();