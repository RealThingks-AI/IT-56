-- Add RLS policies to ensure only org admins can access billing data

-- Drop existing policies on payment_methods to recreate with admin check
DROP POLICY IF EXISTS "Users can view payment methods in their org" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can insert payment methods in their org" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can update payment methods in their org" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can delete payment methods in their org" ON public.payment_methods;

-- Drop existing policies on subscriptions to recreate with admin check
DROP POLICY IF EXISTS "Users can view their own organisation" ON public.subscriptions;

-- Create policies for payment_methods - only org admins
CREATE POLICY "Org admins can view payment methods"
ON public.payment_methods
FOR SELECT
TO authenticated
USING (
  organisation_id = get_user_org_if_admin()
);

CREATE POLICY "Org admins can insert payment methods"
ON public.payment_methods
FOR INSERT
TO authenticated
WITH CHECK (
  organisation_id = get_user_org_if_admin()
);

CREATE POLICY "Org admins can update payment methods"
ON public.payment_methods
FOR UPDATE
TO authenticated
USING (
  organisation_id = get_user_org_if_admin()
)
WITH CHECK (
  organisation_id = get_user_org_if_admin()
);

CREATE POLICY "Org admins can delete payment methods"
ON public.payment_methods
FOR DELETE
TO authenticated
USING (
  organisation_id = get_user_org_if_admin()
);

-- Create policies for subscriptions - allow org admins and personal accounts
CREATE POLICY "Org admins can view subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  organisation_id = get_user_org_if_admin()
  OR
  -- Personal accounts can view their own subscription
  (organisation_id IN (
    SELECT organisation_id FROM users 
    WHERE auth_user_id = auth.uid() 
    AND organisation_id IN (
      SELECT id FROM organisations WHERE account_type = 'personal'
    )
  ))
);

-- Create policies for saas_billing_history - org admins only
DROP POLICY IF EXISTS "Super admins have full access to saas_billing_history" ON public.saas_billing_history;

CREATE POLICY "Super admins have full access to billing history"
ON public.saas_billing_history
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Org admins can view billing history"
ON public.saas_billing_history
FOR SELECT
TO authenticated
USING (
  organisation_id IN (
    SELECT organisation_id FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
  OR
  -- Personal accounts can view their own billing
  organisation_id IN (
    SELECT organisation_id FROM users 
    WHERE auth_user_id = auth.uid() 
    AND organisation_id IN (
      SELECT id FROM organisations WHERE account_type = 'personal'
    )
  )
);

-- Log access attempts to payment pages in audit_logs (optional - for future implementation)
-- This would require application-level logging, not done via RLS