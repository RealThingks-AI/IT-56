
-- Clean up inventory from organizations' active_tools array since we deleted that tool
UPDATE organisations
SET active_tools = array_remove(active_tools, 'inventory')
WHERE 'inventory' = ANY(active_tools);
