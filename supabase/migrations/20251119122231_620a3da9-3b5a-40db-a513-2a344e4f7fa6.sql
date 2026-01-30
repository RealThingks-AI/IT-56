-- Fix infinite recursion in users RLS policies

-- 1) Drop recursive policies that reference users via get_user_org()
DROP POLICY IF EXISTS "Admins can manage users in their organisation" ON users;
DROP POLICY IF EXISTS "Users can view users in their organisation" ON users;

-- 2) Add safe, non-recursive policies

-- Allow each authenticated user to view their own user row
CREATE POLICY "Users can view self"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

-- Allow each authenticated user to update their own user row (if needed)
CREATE POLICY "Users can update self"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- NOTE: Super admin policies already exist and remain unchanged:
--  "Super admins can view all users" (SELECT)
--  "Super admins can manage all users" (ALL)
-- Both rely only on is_super_admin(auth.uid()) which does not cause recursion.