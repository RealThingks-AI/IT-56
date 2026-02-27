

# Fix Licenses Section - Complete Overhaul

## Root Cause: RLS Policy Missing

The **"new row violates row-level security"** error when adding a license is caused by the `itam_licenses` table having RLS enabled but **zero policies defined**. This blocks all INSERT/UPDATE/DELETE operations.

## Bugs Found

1. **Missing RLS policy on `itam_licenses`** - No policy exists, blocking all writes (INSERT, UPDATE, DELETE)
2. **Missing RLS policies on `itam_repairs`, `itam_purchase_orders`, `itam_settings`, `itam_tag_series`** - Same issue as above
3. **Add License form navigates to standalone page** instead of staying within the Advanced tab layout
4. **License detail route conflict** - `/assets/licenses/:licenseId` conflicts with `/assets/licenses/add-license` and `/assets/licenses/allocate`
5. **Cancel button navigates to `/assets/licenses`** (standalone page) instead of back to the Advanced tab (`/assets/advanced`)
6. **No vendor available in dropdown** - `itam_vendors` table is empty, but no "add vendor" inline option exists
7. **Form doesn't use the Assets layout** - Add/Edit/Allocate license pages render outside the sidebar layout

## Implementation Plan

### Step 1: Database Migration - Add Missing RLS Policies

Add `auth_all` RLS policy to `itam_licenses` (and other missing tables):

```sql
CREATE POLICY "auth_all" ON itam_licenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON itam_repairs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON itam_purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON itam_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON itam_tag_series FOR ALL USING (true) WITH CHECK (true);
```

This matches the pattern used by all other `itam_*` tables (e.g., `itam_assets`, `itam_categories`, `itam_vendors`).

### Step 2: Fix Navigation - Keep Users Inside Assets Layout

Update `add-license.tsx`:
- Change Cancel button to navigate to `/assets/advanced` (with `?tab=licenses`) instead of `/assets/licenses`
- Change success redirect to `/assets/advanced?tab=licenses`
- Remove `min-h-screen bg-background` wrapper (it's already inside the Assets layout)

Update `allocate.tsx`:
- Same navigation fixes as above

Update `detail/[licenseId].tsx`:
- Fix back navigation to go to `/assets/advanced?tab=licenses`

Update `index.tsx` (LicensesList):
- Fix all `navigate("/assets/licenses/...")` calls to be consistent

### Step 3: Fix Route Order in App.tsx

Reorder routes so specific routes come before the parameterized route:
```
/assets/licenses/add-license   (specific - first)
/assets/licenses/allocate      (specific - first)  
/assets/licenses/detail/:id    (parameterized - last)
```

### Step 4: Polish Add License Form UI

Clean up `add-license.tsx`:
- Remove outer `min-h-screen` wrapper (already within layout)
- Tighten spacing and padding for consistency with the rest of the app
- Ensure compact form layout matches the design language

### Step 5: Polish License List (index.tsx) Embedded View

- Ensure the embedded view (`embedded={true}`) fills the viewport properly without extra padding
- Verify stat cards, table, and pagination are visually consistent

---

## Files to Modify

| File | Change |
|------|--------|
| New SQL migration | Add RLS policies for `itam_licenses` + 4 other tables |
| `src/pages/helpdesk/assets/licenses/add-license.tsx` | Fix navigation, remove redundant wrappers, polish layout |
| `src/pages/helpdesk/assets/licenses/allocate.tsx` | Fix navigation targets |
| `src/pages/helpdesk/assets/licenses/detail/[licenseId].tsx` | Fix back navigation |
| `src/pages/helpdesk/assets/licenses/index.tsx` | Fix navigation paths |
| `src/App.tsx` | Reorder license routes to prevent conflicts |

