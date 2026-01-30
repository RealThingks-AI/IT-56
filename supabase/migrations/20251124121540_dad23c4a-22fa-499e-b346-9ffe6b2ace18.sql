-- Add INSERT policy for helpdesk_problems table
CREATE POLICY "org_isolation_insert_problems"
ON helpdesk_problems
FOR INSERT
TO authenticated
WITH CHECK (
  (organisation_id = get_user_org()) 
  OR 
  (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
);