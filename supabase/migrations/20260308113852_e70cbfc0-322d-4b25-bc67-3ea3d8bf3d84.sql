-- Reassign assets from inactive Equipment categories to active Equipment
UPDATE itam_assets SET category_id = 'd2eb91e8-57d3-413a-a8e5-b1ab0505d7d9'
WHERE category_id IN ('229e4707-4705-4fc4-bdb6-fd0da54bc50e', '1d94750e-adf1-41d1-a2c6-1955c91f2011');

-- Also update category_tag_formats if any reference old IDs
UPDATE category_tag_formats SET category_id = 'd2eb91e8-57d3-413a-a8e5-b1ab0505d7d9'
WHERE category_id IN ('229e4707-4705-4fc4-bdb6-fd0da54bc50e', '1d94750e-adf1-41d1-a2c6-1955c91f2011');

-- Delete orphaned inactive duplicate categories
DELETE FROM itam_categories WHERE id IN ('229e4707-4705-4fc4-bdb6-fd0da54bc50e', '1d94750e-adf1-41d1-a2c6-1955c91f2011');