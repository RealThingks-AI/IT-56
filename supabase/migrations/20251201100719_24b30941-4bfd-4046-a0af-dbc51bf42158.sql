-- Drop the old unique constraint that causes conflicts across organisations
ALTER TABLE public.helpdesk_categories 
DROP CONSTRAINT IF EXISTS helpdesk_categories_tenant_id_name_key;

-- Add new unique constraint per organisation instead of per tenant
ALTER TABLE public.helpdesk_categories 
ADD CONSTRAINT helpdesk_categories_organisation_id_name_key 
UNIQUE (organisation_id, name);