-- Clean up peripheral asset names: remove " - Username" suffix from Headphones, Mouse, Keyboard
UPDATE itam_assets 
SET name = split_part(name, ' - ', 1),
    updated_at = now()
WHERE category_id IN (
  'b74a9d25-2143-419f-945e-3a978c38fab0',  -- Headphones
  'efff9267-49db-4dbe-a106-d4ee9f5e579b',  -- Mouse
  '8736a5f8-a761-49c1-be5d-8bb784614e3c'   -- Keyboard
)
AND name LIKE '% - %'
AND name NOT LIKE '% - Stock';