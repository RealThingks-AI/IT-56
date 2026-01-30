
-- Update tickets tool to it_help_desk
UPDATE tools SET 
  name = 'IT Help Desk',
  key = 'it_help_desk',
  description = 'Streamline customer support with ticket management'
WHERE key = 'tickets';
