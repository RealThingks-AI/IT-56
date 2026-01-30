
-- Update organisations' active_tools array to replace 'tickets' with 'it_help_desk'
UPDATE organisations
SET active_tools = array_replace(active_tools, 'tickets', 'it_help_desk')
WHERE 'tickets' = ANY(active_tools);
