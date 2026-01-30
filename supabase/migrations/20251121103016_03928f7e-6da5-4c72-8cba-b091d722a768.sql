
-- Delete the 3 tools that are not in your 6-tool dashboard
DELETE FROM tools WHERE key IN ('inventory', 'marketing', 'recruitment');
