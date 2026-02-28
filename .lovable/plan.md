

# Fix Asset Export: Open Field Selection Page Instead of Direct Export

## Problem
The "Export to Excel" dropdown button in All Assets page uses an inline `exportToXLSX` function that:
1. Only exports currently visible table columns (not all asset fields)
2. Shows raw UUIDs for `assigned_to` and `created_by` instead of user names
3. Doesn't let users choose which fields to export
4. Misses important fields like Name, Warranty Expiry, Vendor, Notes

A proper Import/Export page already exists at `/assets/import-export` with full field selection, UUID-to-name resolution, and format options.

## Changes

### 1. `src/pages/helpdesk/assets/allassets.tsx`
- Change the "Export to Excel" dropdown item to navigate to `/assets/import-export` instead of calling `handleExportToExcel()`
- Remove the unused inline `exportToXLSX` function and related helpers (`getVisibleColumnsForExport`, `handleExportToExcel`, `assetsData` state, `onDataLoad` prop usage)

### 2. `src/hooks/useAssetExportImport.tsx` — Add missing export fields
Add these fields to `EXPORT_FIELD_GROUPS` that are missing but exist in DB:
- **Asset Fields**: `notes` (Notes), `check_out_notes` (Checkout Notes)
- **Linking Fields**: `vendor` already exists — good
- **Status Fields**: `assigned_to` already resolves via userMap — good  
- **Financial Fields** (new group): `salvage_value` (Salvage Value), `useful_life_years` (Useful Life), `depreciation_method` (Depreciation Method)
- **Event Fields** (new group): `checked_out_at` (Checked Out Date), `expected_return_date` (Expected Return Date)

Ensure ALL UUID fields in the export resolve to human-readable values (already done for `assigned_to` via `userMap` — also add `created_by`, `checked_out_to`).

### 3. `src/hooks/useAssetExportImport.tsx` — Extend export resolver
In the `exportAssets` function, add resolution for new fields:
- `notes` → `asset.notes`
- `check_out_notes` → `asset.check_out_notes`
- `created_by` → resolve UUID via `userMap`
- `checked_out_to` → resolve UUID via `userMap`
- `checked_out_at` → format date
- `expected_return_date` → format date
- `salvage_value` → format currency
- `useful_life_years` → number as string
- `depreciation_method` → title case

