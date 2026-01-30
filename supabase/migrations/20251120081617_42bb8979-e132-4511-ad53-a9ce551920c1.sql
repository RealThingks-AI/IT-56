-- Fix security definer views by recreating them without security definer
DROP VIEW IF EXISTS public.individual_users;
DROP VIEW IF EXISTS public.organization_users;

-- Create views without security definer (they will inherit caller's permissions)
CREATE VIEW public.individual_users
WITH (security_invoker = true) AS
SELECT u.*, o.name as account_name
FROM public.users u
LEFT JOIN public.organisations o ON u.organisation_id = o.id
WHERE u.user_type = 'individual' AND o.account_type = 'personal';

CREATE VIEW public.organization_users
WITH (security_invoker = true) AS
SELECT u.*, o.name as organisation_name, o.account_type
FROM public.users u
LEFT JOIN public.organisations o ON u.organisation_id = o.id
WHERE u.user_type = 'organization' AND o.account_type = 'organization';