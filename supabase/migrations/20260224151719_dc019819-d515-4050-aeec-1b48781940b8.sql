
-- Phase 2: Set DEFAULT 1 on all NOT NULL tenant_id columns
ALTER TABLE helpdesk_automation_rules ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE helpdesk_categories ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE helpdesk_changes ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE helpdesk_kb_articles ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE helpdesk_kb_categories ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE helpdesk_problems ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE helpdesk_queues ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE helpdesk_sla_policies ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE helpdesk_ticket_attachments ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE helpdesk_ticket_comments ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE helpdesk_ticket_history ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE helpdesk_tickets ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE profiles ALTER COLUMN tenant_id SET DEFAULT 1;

-- Also set defaults on nullable tenant_id columns for consistency
ALTER TABLE category_tag_formats ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE helpdesk_canned_responses ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE helpdesk_ticket_templates ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE itam_asset_assignments ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE itam_asset_history ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE itam_assets ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE itam_categories ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE itam_company_info ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE itam_departments ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE itam_license_allocations ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE itam_licenses ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE itam_locations ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE itam_makes ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE itam_purchase_orders ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE itam_repairs ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE itam_settings ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE itam_sites ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE itam_tag_format ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE itam_tag_series ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE itam_vendors ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE monitor_data ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE monitoring_alerts ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE monitoring_incidents ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE monitors ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE notifications ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE subscriptions_licenses ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE subscriptions_payments ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE subscriptions_reminders ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE subscriptions_tools ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE subscriptions_vendors ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE system_devices ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE system_installed_updates ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE system_pending_updates ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE system_update_alerts ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE system_update_history ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE system_update_ingest_logs ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE system_updates ALTER COLUMN tenant_id SET DEFAULT 1;

-- Update RPC functions to default p_tenant_id to 1
CREATE OR REPLACE FUNCTION public.generate_helpdesk_ticket_number(p_tenant_id bigint DEFAULT 1, p_org_id uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_number INTEGER;
  ticket_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM helpdesk_tickets;
  
  ticket_num := 'TKT-' || LPAD(next_number::TEXT, 6, '0');
  RETURN ticket_num;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_problem_number(p_tenant_id bigint DEFAULT 1, p_org_id uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_number INTEGER;
  problem_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(problem_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM helpdesk_problems;
  
  problem_num := 'PRB-' || LPAD(next_number::TEXT, 6, '0');
  RETURN problem_num;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_change_number(p_tenant_id bigint DEFAULT 1, p_org_id uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_number INTEGER;
  change_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(change_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM helpdesk_changes;
  
  change_num := 'CHG-' || LPAD(next_number::TEXT, 6, '0');
  RETURN change_num;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_change_request_number(p_tenant_id bigint DEFAULT 1)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_number INTEGER;
  change_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(change_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM change_requests;
  
  change_num := 'CHR-' || LPAD(next_number::TEXT, 6, '0');
  RETURN change_num;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_asset_tag(tenant_id_param bigint DEFAULT 1)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_number INTEGER;
  asset_tag TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(asset_tag FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM itam_assets;
  
  asset_tag := 'AST-' || LPAD(next_number::TEXT, 6, '0');
  RETURN asset_tag;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_srm_request_number(p_tenant_id bigint DEFAULT 1, p_org_id uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_number INTEGER;
  request_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM srm_requests;
  
  request_num := 'SRM-' || LPAD(next_number::TEXT, 6, '0');
  RETURN request_num;
END;
$function$;
