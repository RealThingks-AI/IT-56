
-- Drop the existing overly-permissive policy on itam_asset_history
DROP POLICY IF EXISTS "auth_all" ON public.itam_asset_history;

-- Allow authenticated users to read logs
CREATE POLICY "Authenticated users can view asset history"
ON public.itam_asset_history
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert logs
CREATE POLICY "Authenticated users can insert asset history"
ON public.itam_asset_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- No UPDATE or DELETE policies = logs are immutable
