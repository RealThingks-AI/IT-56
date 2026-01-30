-- Step 1: Add request_type enum
DO $$ BEGIN
  CREATE TYPE request_type AS ENUM ('ticket', 'service_request');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Drop the old status check constraint and create a new one that accommodates both types
ALTER TABLE public.helpdesk_tickets 
  DROP CONSTRAINT IF EXISTS helpdesk_tickets_status_check;

ALTER TABLE public.helpdesk_tickets 
  ADD CONSTRAINT helpdesk_tickets_status_check CHECK (
    status = ANY (ARRAY[
      'open'::text, 
      'in_progress'::text, 
      'resolved'::text, 
      'closed'::text, 
      'on_hold'::text,
      'pending'::text,
      'approved'::text,
      'rejected'::text,
      'fulfilled'::text,
      'cancelled'::text
    ])
  );

-- Step 3: Add new columns to helpdesk_tickets to accommodate SRM fields
ALTER TABLE public.helpdesk_tickets 
  ADD COLUMN IF NOT EXISTS request_type request_type DEFAULT 'ticket',
  ADD COLUMN IF NOT EXISTS catalog_item_id bigint REFERENCES public.srm_catalog(id),
  ADD COLUMN IF NOT EXISTS form_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS additional_notes text,
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Ensure requester_id exists (should already exist from previous migration)
ALTER TABLE public.helpdesk_tickets 
  ADD COLUMN IF NOT EXISTS requester_id uuid REFERENCES public.users(id);

-- Step 4: Set default requester_id to created_by for existing tickets
UPDATE public.helpdesk_tickets 
SET requester_id = created_by 
WHERE requester_id IS NULL AND created_by IS NOT NULL;

-- Step 5: Migrate data from srm_requests to helpdesk_tickets
INSERT INTO public.helpdesk_tickets (
  ticket_number,
  request_type,
  title,
  description,
  priority,
  status,
  requester_id,
  assignee_id,
  catalog_item_id,
  form_data,
  additional_notes,
  fulfilled_at,
  rejected_at,
  rejection_reason,
  organisation_id,
  tenant_id,
  created_at,
  updated_at,
  updated_by,
  is_deleted
)
SELECT 
  sr.request_number as ticket_number,
  'service_request'::request_type as request_type,
  COALESCE(sc.name, 'Service Request') as title,
  COALESCE(sr.description, sr.additional_notes, '') as description,
  COALESCE(sr.priority, 'medium') as priority,
  sr.status,
  sr.requester_id,
  sr.assigned_to as assignee_id,
  sr.catalog_item_id,
  COALESCE(sr.form_data, '{}'::jsonb) as form_data,
  sr.additional_notes,
  sr.fulfilled_at,
  sr.rejected_at,
  sr.rejection_reason,
  sr.organisation_id,
  sr.tenant_id,
  sr.created_at,
  sr.updated_at,
  sr.updated_by,
  COALESCE(sr.is_deleted, false) as is_deleted
FROM public.srm_requests sr
LEFT JOIN public.srm_catalog sc ON sr.catalog_item_id = sc.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.helpdesk_tickets 
  WHERE helpdesk_tickets.ticket_number = sr.request_number
);

-- Step 6: Create unified ticket number generation function
CREATE OR REPLACE FUNCTION public.generate_unified_request_number(
  p_tenant_id bigint, 
  p_org_id uuid,
  p_request_type request_type
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_number INTEGER;
  request_num TEXT;
  prefix TEXT;
BEGIN
  -- Set prefix based on request type
  IF p_request_type = 'service_request' THEN
    prefix := 'SRM-';
  ELSE
    prefix := 'TKT-';
  END IF;

  -- Get next number for this request type and org/tenant
  IF p_org_id IS NOT NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM helpdesk_tickets
    WHERE organisation_id = p_org_id
      AND request_type = p_request_type;
  ELSE
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM helpdesk_tickets
    WHERE tenant_id = p_tenant_id
      AND request_type = p_request_type;
  END IF;
  
  request_num := prefix || LPAD(next_number::TEXT, 6, '0');
  RETURN request_num;
END;
$function$;

-- Step 7: Create indexes on request_type for better query performance
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_request_type 
ON public.helpdesk_tickets(request_type);

CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_catalog_item 
ON public.helpdesk_tickets(catalog_item_id) WHERE catalog_item_id IS NOT NULL;

-- Step 8: Update RLS policies to handle both types
DROP POLICY IF EXISTS "org_isolation_select_helpdesk_tickets" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "org_isolation_insert_helpdesk_tickets" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "org_isolation_update_helpdesk_tickets" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "org_isolation_delete_helpdesk_tickets" ON public.helpdesk_tickets;

CREATE POLICY "org_isolation_select_helpdesk_tickets"
ON public.helpdesk_tickets
FOR SELECT
USING (
  (organisation_id = auth_organisation_id()) 
  OR is_super_admin_user()
  OR (organisation_id IS NULL AND tenant_id = get_user_tenant(auth.uid()))
);

CREATE POLICY "org_isolation_insert_helpdesk_tickets"
ON public.helpdesk_tickets
FOR INSERT
WITH CHECK (
  (organisation_id = auth_organisation_id())
  OR (organisation_id IS NULL AND tenant_id = get_user_tenant(auth.uid()))
);

CREATE POLICY "org_isolation_update_helpdesk_tickets"
ON public.helpdesk_tickets
FOR UPDATE
USING (
  (organisation_id = auth_organisation_id())
  OR is_super_admin_user()
  OR (organisation_id IS NULL AND tenant_id = get_user_tenant(auth.uid()))
);

CREATE POLICY "org_isolation_delete_helpdesk_tickets"
ON public.helpdesk_tickets
FOR DELETE
USING (
  is_super_admin_user()
  OR (
    (organisation_id = auth_organisation_id() OR (organisation_id IS NULL AND tenant_id = get_user_tenant(auth.uid())))
    AND has_org_access(organisation_id)
  )
);

-- Step 9: Add comments
COMMENT ON COLUMN public.helpdesk_tickets.request_type IS 'Distinguishes between regular tickets and service requests';
COMMENT ON TABLE public.helpdesk_tickets IS 'Unified table for both helpdesk tickets and service requests';