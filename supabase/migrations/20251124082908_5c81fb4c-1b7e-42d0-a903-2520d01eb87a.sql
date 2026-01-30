
-- Add RLS policy for super admins to view all issue reports
CREATE POLICY "Super admins can view all issue reports"
ON public.issue_reports
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM appmaster_admins
    WHERE appmaster_admins.user_id = auth.uid()
      AND appmaster_admins.is_active = true
  )
);

-- Add RLS policy for super admins to update issue reports
CREATE POLICY "Super admins can update issue reports"
ON public.issue_reports
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM appmaster_admins
    WHERE appmaster_admins.user_id = auth.uid()
      AND appmaster_admins.is_active = true
  )
);
