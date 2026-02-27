
-- Add RLS policies for itam_assets
CREATE POLICY "auth_all" ON public.itam_assets FOR ALL USING (true) WITH CHECK (true);
