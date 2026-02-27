-- Fix asset category assignments based on asset_tag prefix
-- RT-LTP → Laptop
UPDATE itam_assets SET category_id = '06084f73-e9c9-4313-bb7d-a40adab08600' WHERE asset_tag LIKE 'RT-LTP-%';
-- RT-MTR → Monitor
UPDATE itam_assets SET category_id = '23a36812-d9d9-45cf-b669-a9233083579d' WHERE asset_tag LIKE 'RT-MTR-%';
-- RT-CLI → Client
UPDATE itam_assets SET category_id = '928ca8a4-a349-433e-b718-970bdce576c1' WHERE asset_tag LIKE 'RT-CLI-%';
-- RT-EQP → Computer equipment
UPDATE itam_assets SET category_id = 'd2eb91e8-57d3-413a-a8e5-b1ab0505d7d9' WHERE asset_tag LIKE 'RT-EQP-%';
-- RT-SVR → Computer equipment (no dedicated Server category)
UPDATE itam_assets SET category_id = 'd2eb91e8-57d3-413a-a8e5-b1ab0505d7d9' WHERE asset_tag LIKE 'RT-SVR-%';

-- Also sync all category_tag_formats counters to match actual data
UPDATE category_tag_formats SET current_number = (
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(asset_tag, '^.*-(\d+)$', '\1'), asset_tag) AS INTEGER)
  ), 0) + 1
  FROM itam_assets 
  WHERE asset_tag LIKE category_tag_formats.prefix || '%'
)
WHERE EXISTS (SELECT 1 FROM itam_assets WHERE asset_tag LIKE category_tag_formats.prefix || '%');