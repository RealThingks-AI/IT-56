-- Add Subscriptions tool if it doesn't exist
INSERT INTO public.tools (name, key, description, active, monthly_price, yearly_price, price)
VALUES ('Subscriptions', 'subscriptions', 'IT Tools & Subscriptions Management', true, 0, 0, 0)
ON CONFLICT (key) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  active = EXCLUDED.active;