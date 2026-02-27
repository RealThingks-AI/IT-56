
-- Fix corrupted Laptop counter
UPDATE category_tag_formats SET current_number = 111
WHERE category_id = '06084f73-e9c9-4313-bb7d-a40adab08600';

-- Remove orphan tag formats for inactive duplicate categories
DELETE FROM category_tag_formats WHERE category_id IN (
  SELECT id FROM itam_categories WHERE is_active = false
);

-- Partial unique index to prevent future duplicate active categories
CREATE UNIQUE INDEX idx_itam_categories_name_active 
ON itam_categories (lower(name)) WHERE is_active = true;
