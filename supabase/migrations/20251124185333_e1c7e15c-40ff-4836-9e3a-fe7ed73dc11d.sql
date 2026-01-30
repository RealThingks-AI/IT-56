-- Create soft delete function for problems (similar to soft_delete_ticket)
CREATE OR REPLACE FUNCTION public.soft_delete_problem(problem_id_param integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE helpdesk_problems
  SET is_deleted = TRUE,
      updated_at = NOW(),
      updated_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
  WHERE id = problem_id_param
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

-- Create bulk soft delete function for problems
CREATE OR REPLACE FUNCTION public.bulk_soft_delete_problems(problem_ids integer[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE helpdesk_problems
  SET is_deleted = TRUE,
      updated_at = NOW(),
      updated_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
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

-- Create bulk soft delete function for tickets
CREATE OR REPLACE FUNCTION public.bulk_soft_delete_tickets(ticket_ids integer[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE helpdesk_tickets
  SET is_deleted = TRUE,
      updated_at = NOW(),
      updated_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
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