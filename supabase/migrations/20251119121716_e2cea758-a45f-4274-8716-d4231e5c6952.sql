-- Add RLS policies for super admins to view all users
CREATE POLICY "Super admins can view all users"
ON users
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Add RLS policies for super admins to manage all users
CREATE POLICY "Super admins can manage all users"
ON users
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Add RLS policies for super admins to view all organisations
CREATE POLICY "Super admins can view all organisations"
ON organisations
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Add RLS policies for super admins to manage all organisations
CREATE POLICY "Super admins can manage all organisations"
ON organisations
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Add RLS policies for super admins to view all subscriptions
CREATE POLICY "Super admins can view all subscriptions"
ON subscriptions
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Add RLS policies for super admins to view all audit logs
CREATE POLICY "Super admins can view all audit logs"
ON audit_logs
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));