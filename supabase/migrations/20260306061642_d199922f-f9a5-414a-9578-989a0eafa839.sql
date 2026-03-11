
-- Sync existing drifted users.role from user_roles
DO $$
BEGIN
  UPDATE users u SET role = ur.role::text
  FROM user_roles ur 
  WHERE ur.user_id = u.auth_user_id
  AND u.role IS DISTINCT FROM ur.role::text;
END $$;
