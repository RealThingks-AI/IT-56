-- Fix orphaned "in_use" assets that have no assignment
UPDATE itam_assets
SET status = 'available'
WHERE status = 'in_use'
  AND assigned_to IS NULL
  AND checked_out_to IS NULL;