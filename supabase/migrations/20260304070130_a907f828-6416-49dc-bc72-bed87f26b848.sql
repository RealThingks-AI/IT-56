
-- Drop the overly-permissive SELECT policy on audit_logs
DROP POLICY IF EXISTS "Authenticated SELECT audit_logs" ON public.audit_logs;

-- Create restrictive policy: only admin/manager can read audit logs
CREATE POLICY "Admin and manager can read audit_logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'manager'::public.app_role])
);

-- Fix itam_email_logs permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated INSERT itam_email_logs" ON public.itam_email_logs;

CREATE POLICY "Admin manager can insert email_logs"
ON public.itam_email_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'manager'::public.app_role])
);
