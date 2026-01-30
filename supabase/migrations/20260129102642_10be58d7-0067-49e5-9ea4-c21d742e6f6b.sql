-- Create batch access check function for better performance
CREATE OR REPLACE FUNCTION public.check_multiple_routes_access(_routes text[])
RETURNS TABLE(route text, has_access boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _route text;
BEGIN
  FOREACH _route IN ARRAY _routes
  LOOP
    route := _route;
    has_access := check_page_access(_route);
    RETURN NEXT;
  END LOOP;
END;
$$;