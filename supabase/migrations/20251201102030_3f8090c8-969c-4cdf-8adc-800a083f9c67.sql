-- Drop the old function
DROP FUNCTION IF EXISTS public.generate_problem_number(bigint, uuid);

-- Create updated function that generates globally unique problem numbers
CREATE OR REPLACE FUNCTION public.generate_problem_number(p_tenant_id bigint, p_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_number INTEGER;
  problem_num TEXT;
BEGIN
  -- Get the next number globally across all organisations and tenants
  SELECT COALESCE(MAX(CAST(SUBSTRING(problem_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM helpdesk_problems;
  
  problem_num := 'PRB-' || LPAD(next_number::TEXT, 6, '0');
  RETURN problem_num;
END;
$$;