-- Drop existing problematic policies
DROP POLICY IF EXISTS "Only appmaster admins can view appmaster_admins" ON public.appmaster_admins;
DROP POLICY IF EXISTS "Only super admins can manage appmaster_admins" ON public.appmaster_admins;

-- Recreate policies using the existing security definer functions
-- These functions bypass RLS and prevent infinite recursion
CREATE POLICY "Appmaster admins can view appmaster_admins"
ON public.appmaster_admins
FOR SELECT
TO authenticated
USING (public.is_appmaster_admin(auth.uid()));

CREATE POLICY "Super admins can manage appmaster_admins"
ON public.appmaster_admins
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));