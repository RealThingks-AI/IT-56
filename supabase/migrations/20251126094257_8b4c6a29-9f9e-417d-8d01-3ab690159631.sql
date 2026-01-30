-- Insert standard asset categories into itam_categories table
-- This ensures categories in Fields Setup match the asset type dropdown

INSERT INTO itam_categories (tenant_id, organisation_id, code, name)
SELECT 
  1 as tenant_id,
  o.id as organisation_id,
  UPPER(SUBSTRING(unnest.category, 1, 3)) as code,
  unnest.category as name
FROM organisations o
CROSS JOIN unnest(ARRAY[
  'Laptop',
  'Desktop', 
  'Monitor',
  'Printer',
  'Phone',
  'Tablet',
  'Server',
  'Network Device',
  'Furniture',
  'Other'
]) AS unnest(category)
ON CONFLICT DO NOTHING;