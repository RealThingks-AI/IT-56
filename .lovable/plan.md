

# Asset Module Deep Audit — Bugs & Improvements

## Status: ✅ Completed

## Changes Made

### B1 + B9: Dispose sets `is_active: false` (Critical)
- `dispose.tsx` — added `is_active: false` to the dispose mutation
- `AssetsList.tsx` — bulk dispose now sets `is_active: false` and clears assignment fields
- `DisposeAssetDialog.tsx` — detail-page dispose also sets `is_active: false`

### B10: Dashboard disposed count fixed
- `dashboard.tsx` — `disposedCount` now uses a separate `count-only` query instead of being capped at the feed's `.limit(15)`

### B3 + U1: Add Asset name field
- `add.tsx` — added `asset_name` to zod schema, form defaults, edit-mode reset, and insert/update payloads
- Added "Asset Name" form field in the UI after "Model"

### B4: CheckOutDialog history already had asset_tag
- Verified `CheckOutDialog.tsx` already fetches and includes `asset_tag` in history insert (no change needed)

### B5: Purchase Orders query limit
- `purchase-orders/index.tsx` — added `.limit(5000)` to PO query

### B6: Alerts page column selection
- `alerts/index.tsx` — replaced `select("*")` with specific columns

### B7: Repair number generation
- `repairs/create.tsx` — replaced `Math.random()` with sequential numbering based on last repair number from DB
