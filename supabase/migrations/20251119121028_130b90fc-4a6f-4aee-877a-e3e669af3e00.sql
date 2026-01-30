-- Add current user as super admin
INSERT INTO super_admin_users (user_id, role, is_active, permissions) 
VALUES ('eada2542-6a93-4340-ac00-f1daac489c33', 'super_admin', true, 
  ARRAY['saas.manage_orgs', 'saas.manage_users', 'saas.manage_plans', 
        'saas.manage_billing', 'saas.view_logs', 'saas.system_settings', 
        'saas.impersonate', 'saas.manage_feature_flags', 'saas.view_usage', 
        'saas.trigger_jobs', 'saas.view_audit_trail'])
ON CONFLICT DO NOTHING;