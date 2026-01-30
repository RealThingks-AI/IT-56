-- Enable RLS on subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow super admins to view all subscription plans
CREATE POLICY "Super admins can view subscription plans"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Allow super admins to create subscription plans
CREATE POLICY "Super admins can create subscription plans"
ON public.subscription_plans
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- Allow super admins to update subscription plans
CREATE POLICY "Super admins can update subscription plans"
ON public.subscription_plans
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Allow super admins to delete subscription plans
CREATE POLICY "Super admins can delete subscription plans"
ON public.subscription_plans
FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

-- Allow all authenticated users to view active subscription plans (for pricing page)
CREATE POLICY "Authenticated users can view subscription plans"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (true);