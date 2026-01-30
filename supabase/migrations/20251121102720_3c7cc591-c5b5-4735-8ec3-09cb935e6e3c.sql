
-- Update tools to match the 6 shown on dashboard
UPDATE tools SET active = true WHERE key IN ('assets', 'attendance', 'crm', 'invoicing', 'subscriptions', 'tickets');
UPDATE tools SET active = false WHERE key IN ('inventory', 'marketing', 'recruitment');
