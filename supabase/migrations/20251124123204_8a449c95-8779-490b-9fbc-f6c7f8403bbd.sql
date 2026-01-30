ALTER POLICY "org_isolation_select_problems"
ON public.helpdesk_problems
USING (
  auth.uid() IS NOT NULL
  AND (
    organisation_id = get_user_org()
    OR tenant_id = get_user_tenant(auth.uid())
  )
);