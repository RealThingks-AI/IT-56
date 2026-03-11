
ALTER TABLE subscriptions_tools
  ADD COLUMN IF NOT EXISTS subscription_type text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS next_payment_date date,
  ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS renewal_alert_days integer DEFAULT 30;
