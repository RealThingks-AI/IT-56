-- Clean up deprecated subscription fields after UI alignment
ALTER TABLE public.subscriptions_tools
  DROP COLUMN IF EXISTS country,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS billing_cycle;