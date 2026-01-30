-- First drop the trigger that depends on enforce_user_limit
DROP TRIGGER IF EXISTS enforce_user_limit_trigger ON users;

-- Phase 1: Drop non-helpdesk tables
-- Inventory Module
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS inventory_stock CASCADE;
DROP TABLE IF EXISTS inventory_warehouses CASCADE;

-- Invoicing Module
DROP TABLE IF EXISTS invoice_items CASCADE;

-- Critical Systems (not used by helpdesk monitoring)
DROP TABLE IF EXISTS critical_systems CASCADE;

-- Team Management
DROP TABLE IF EXISTS team_groups CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;

-- Auth Providers (legacy)
DROP TABLE IF EXISTS auth_providers CASCADE;

-- Standalone Tickets (separate from helpdesk_tickets)
DROP TABLE IF EXISTS tickets CASCADE;

-- Services (not monitoring)
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS service_health CASCADE;

-- Issue Reports
DROP TABLE IF EXISTS issue_reports CASCADE;

-- License Assignments (duplicate of itam_license_allocations)
DROP TABLE IF EXISTS license_assignments CASCADE;

-- Remaining SaaS Tables
DROP TABLE IF EXISTS saas_org_user_links CASCADE;
DROP TABLE IF EXISTS saas_organisations CASCADE;
DROP TABLE IF EXISTS saas_system_logs CASCADE;
DROP TABLE IF EXISTS saas_usage_metrics CASCADE;
DROP TABLE IF EXISTS saas_users CASCADE;
DROP TABLE IF EXISTS saas_webhooks CASCADE;
DROP TABLE IF EXISTS saas_worker_jobs CASCADE;

-- SRM Module
DROP TABLE IF EXISTS srm_approvals CASCADE;
DROP TABLE IF EXISTS srm_comments CASCADE;
DROP TABLE IF EXISTS srm_sla_policies CASCADE;

-- User Sessions (Supabase handles auth sessions)
DROP TABLE IF EXISTS user_sessions CASCADE;

-- User Roles (redundant with roles and role_permissions)
DROP TABLE IF EXISTS user_roles CASCADE;

-- Units of Production
DROP TABLE IF EXISTS units_of_production_log CASCADE;

-- Phase 2: Drop unused functions (with CASCADE for safety)
DROP FUNCTION IF EXISTS get_appmaster_admin_details(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_appmaster_role() CASCADE;
DROP FUNCTION IF EXISTS has_super_admin_permission() CASCADE;
DROP FUNCTION IF EXISTS is_appmaster_admin() CASCADE;
DROP FUNCTION IF EXISTS generate_srm_request_number() CASCADE;
DROP FUNCTION IF EXISTS update_srm_updated_at() CASCADE;
DROP FUNCTION IF EXISTS log_invitation_change() CASCADE;
DROP FUNCTION IF EXISTS can_enable_tool(text) CASCADE;
DROP FUNCTION IF EXISTS can_activate_tool(text) CASCADE;
DROP FUNCTION IF EXISTS user_has_tool_access(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS log_tool_assignment() CASCADE;
DROP FUNCTION IF EXISTS verify_account_type(text, text) CASCADE;
DROP FUNCTION IF EXISTS get_user_account_type(uuid) CASCADE;
DROP FUNCTION IF EXISTS check_subscription_limit() CASCADE;
DROP FUNCTION IF EXISTS check_subscription_expiry() CASCADE;
DROP FUNCTION IF EXISTS get_subscription_limits(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_current_subscription(uuid) CASCADE;
DROP FUNCTION IF EXISTS has_feature(text) CASCADE;
DROP FUNCTION IF EXISTS has_feature_access(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS can_add_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS can_invite_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS enforce_user_limit() CASCADE;