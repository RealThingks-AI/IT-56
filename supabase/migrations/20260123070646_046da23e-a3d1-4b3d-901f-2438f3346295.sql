-- Add SELECT policy to organisations table (critical fix)
CREATE POLICY "Users can view their own organisation"
ON public.organisations
FOR SELECT
TO authenticated
USING (id = get_user_org());

-- Add SELECT policy for backup_schedules
CREATE POLICY "Users can view backup schedules for their org"
ON public.backup_schedules
FOR SELECT
TO authenticated
USING (organisation_id = get_user_org());

-- Add INSERT policy for backup_schedules
CREATE POLICY "Admins can insert backup schedules"
ON public.backup_schedules
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') AND organisation_id = get_user_org());

-- Add UPDATE policy for backup_schedules
CREATE POLICY "Admins can update backup schedules"
ON public.backup_schedules
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin') AND organisation_id = get_user_org())
WITH CHECK (has_role(auth.uid(), 'admin') AND organisation_id = get_user_org());

-- Add SELECT policy for system_backups
CREATE POLICY "Users can view system backups for their org"
ON public.system_backups
FOR SELECT
TO authenticated
USING (organisation_id = get_user_org());

-- Add INSERT policy for system_backups
CREATE POLICY "Admins can insert system backups"
ON public.system_backups
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') AND organisation_id = get_user_org());

-- Add UPDATE policy for system_backups
CREATE POLICY "Admins can update system backups"
ON public.system_backups
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin') AND organisation_id = get_user_org())
WITH CHECK (has_role(auth.uid(), 'admin') AND organisation_id = get_user_org());