-- Fix stale 'unconfirmed' assets that have confirmation emails sent but status never updated to 'pending'
UPDATE itam_assets
SET confirmation_status = 'pending'
WHERE confirmation_status = 'unconfirmed'
  AND id IN (
    SELECT DISTINCT ci.asset_id
    FROM itam_asset_confirmation_items ci
    WHERE ci.response IS NULL
  );