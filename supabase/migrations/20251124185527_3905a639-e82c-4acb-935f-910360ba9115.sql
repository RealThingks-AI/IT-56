-- Fix the bulk soft delete functions - remove updated_by to avoid foreign key issues
CREATE OR REPLACE FUNCTION public.bulk_soft_delete_problems(problem_ids integer[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE helpdesk_problems
  SET is_deleted = TRUE,
      updated_at = NOW()
  WHERE id = ANY(problem_ids)
    AND (
      organisation_id IN (
        SELECT organisation_id FROM users WHERE auth_user_id = auth.uid()
      )
      OR tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    );
END;
$$;

-- Fix bulk soft delete function for tickets
CREATE OR REPLACE FUNCTION public.bulk_soft_delete_tickets(ticket_ids integer[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE helpdesk_tickets
  SET is_deleted = TRUE,
      updated_at = NOW()
  WHERE id = ANY(ticket_ids)
    AND (
      organisation_id IN (
        SELECT organisation_id FROM users WHERE auth_user_id = auth.uid()
      )
      OR tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    );
END;
$$;