-- ============================================
-- COMPREHENSIVE CLEANUP: Remove non-helpdesk tables
-- ============================================

-- Drop RLS policies on tables being dropped (CASCADE will handle this)

-- ===========================================
-- STEP 1: Drop Views first (they depend on tables)
-- ===========================================
DROP VIEW IF EXISTS public.individual_users CASCADE;
DROP VIEW IF EXISTS public.organization_users CASCADE;

-- ===========================================
-- STEP 2: Drop Enterprise Admin Tables
-- ===========================================
DROP TABLE IF EXISTS public.appmaster_admins CASCADE;
DROP TABLE IF EXISTS public.super_admin_users CASCADE;

-- ===========================================
-- STEP 3: Drop Announcements/Broadcasts Tables
-- ===========================================
DROP TABLE IF EXISTS public.broadcast_dismissals CASCADE;
DROP TABLE IF EXISTS public.broadcasts CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;

-- ===========================================
-- STEP 4: Drop CRM Module Tables
-- ===========================================
DROP TABLE IF EXISTS public.crm_deals CASCADE;
DROP TABLE IF EXISTS public.crm_contacts CASCADE;
DROP TABLE IF EXISTS public.crm_leads CASCADE;

-- ===========================================
-- STEP 5: Drop SaaS/Multi-tenant Tables
-- ===========================================
DROP TABLE IF EXISTS public.saas_team_invitations CASCADE;
DROP TABLE IF EXISTS public.saas_support_tickets CASCADE;
DROP TABLE IF EXISTS public.saas_tenant_backups CASCADE;
DROP TABLE IF EXISTS public.saas_security_logs CASCADE;
DROP TABLE IF EXISTS public.saas_org_feature_flags CASCADE;
DROP TABLE IF EXISTS public.saas_plan_tools CASCADE;
DROP TABLE IF EXISTS public.saas_maintenance_windows CASCADE;
DROP TABLE IF EXISTS public.saas_feedback_comments CASCADE;
DROP TABLE IF EXISTS public.saas_feedback CASCADE;
DROP TABLE IF EXISTS public.saas_feature_flags CASCADE;
DROP TABLE IF EXISTS public.saas_billing_history CASCADE;
DROP TABLE IF EXISTS public.saas_api_keys CASCADE;
DROP TABLE IF EXISTS public.saas_pricing_tiers CASCADE;

-- ===========================================
-- STEP 6: Drop Invitation Tables
-- ===========================================
DROP TABLE IF EXISTS public.invitations CASCADE;

-- ===========================================
-- STEP 7: Drop Tools-related Tables (if not core to helpdesk)
-- ===========================================
DROP TABLE IF EXISTS public.tool_inactive_notices CASCADE;
DROP TABLE IF EXISTS public.user_tools CASCADE;
DROP TABLE IF EXISTS public.tools CASCADE;

-- ===========================================
-- STEP 8: Drop unused functions
-- ===========================================
DROP FUNCTION IF EXISTS public.is_super_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin_user() CASCADE;
DROP FUNCTION IF EXISTS public.generate_invitation_token() CASCADE;

-- ===========================================
-- STEP 9: Drop unused contact form table
-- ===========================================
DROP TABLE IF EXISTS public.contact_submissions CASCADE;