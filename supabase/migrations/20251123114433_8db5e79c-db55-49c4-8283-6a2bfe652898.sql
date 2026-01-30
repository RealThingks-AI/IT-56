-- Insert helpdesk and other missing tools if they don't exist
INSERT INTO tools (key, name, description, active)
VALUES 
  ('helpdesk', 'IT Helpdesk', 'Complete IT service management with tickets, problems, changes, and knowledge base', true),
  ('srm', 'Service Request Management', 'Manage service requests and catalog', true),
  ('itam', 'IT Asset Management', 'Track and manage IT assets', true),
  ('assets', 'Asset Management', 'Manage company assets and depreciation', true),
  ('invoicing', 'Invoicing', 'Create and manage invoices', true),
  ('attendance', 'Attendance', 'Track employee attendance', true)
ON CONFLICT (key) 
DO UPDATE SET 
  active = true,
  updated_at = now();