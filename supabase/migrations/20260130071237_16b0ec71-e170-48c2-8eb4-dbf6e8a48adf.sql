
-- Phase 1.1: Insert user_roles ONLY for users that exist in auth.users
INSERT INTO user_roles (user_id, role)
SELECT u.auth_user_id, 
  CASE 
    WHEN u.role = 'admin' THEN 'admin'::app_role
    WHEN u.role IN ('employee', 'user') THEN 'user'::app_role
    WHEN u.role = 'manager' THEN 'manager'::app_role
    WHEN u.role = 'viewer' THEN 'viewer'::app_role
    ELSE 'user'::app_role
  END
FROM users u
WHERE u.auth_user_id IS NOT NULL
  AND u.auth_user_id IN (SELECT id FROM auth.users)
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.auth_user_id)
ON CONFLICT (user_id, role) DO NOTHING;

-- Phase 1.2: Update main organisation details
UPDATE organisations 
SET name = 'RT-IT-Hub',
    active_tools = ARRAY['helpdesk', 'assets', 'subscriptions', 'updates', 'monitoring', 'reports', 'audit'],
    plan = 'enterprise'
WHERE id = 'fc8be2fb-4571-4496-8eaa-23cde8554e4e';

-- Phase 1.3: Migrate all valid users to the single main organisation
UPDATE users 
SET organisation_id = 'fc8be2fb-4571-4496-8eaa-23cde8554e4e'
WHERE auth_user_id IS NOT NULL
  AND auth_user_id IN (SELECT id FROM auth.users);

-- Phase 3.1: Fix invalid role values in users table (employee -> user)
UPDATE users 
SET role = 'user' 
WHERE role NOT IN ('admin', 'manager', 'user', 'viewer');
