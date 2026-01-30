-- Fix helpdesk_tickets.created_by foreign key violations by ensuring
-- created_by stores the application user id (public.users.id), while
-- updated_by continues to store the auth user id (auth.users.id).

-- Create a dedicated tracking function for helpdesk_tickets
CREATE OR REPLACE FUNCTION public.set_helpdesk_ticket_user_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_user_id uuid;
BEGIN
  -- Map the current auth user to the application user record
  SELECT id INTO app_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    -- Set created_by to the application user id when available
    IF app_user_id IS NOT NULL THEN
      NEW.created_by := app_user_id;
    END IF;

    -- Preserve existing behaviour for updated_by and organisation_id
    NEW.updated_by := auth.uid();

    IF NEW.organisation_id IS NULL THEN
      NEW.organisation_id := auth_organisation_id();
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by := auth.uid();
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- Replace the generic set_user_tracking trigger for helpdesk_tickets
DROP TRIGGER IF EXISTS set_user_tracking_helpdesk_tickets ON public.helpdesk_tickets;

CREATE TRIGGER set_helpdesk_ticket_user_tracking
BEFORE INSERT OR UPDATE ON public.helpdesk_tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_helpdesk_ticket_user_tracking();