

# Licenses Subsection - Deep Audit & Improvement Plan

## Bugs Found

### Bug 1: Route ordering causes detail page to never load
**File:** `src/App.tsx` lines 204-207
- `/assets/licenses/:licenseId` (line 205) catches `/assets/licenses/add-license` and `/assets/licenses/allocate` before those specific routes (lines 206-207) are reached.
- **Fix:** Move static routes (`add-license`, `allocate`) ABOVE the dynamic `:licenseId` route.

### Bug 2: Allocate page reads wrong query param
**File:** `src/pages/helpdesk/assets/licenses/allocate.tsx` line 25
- Reads `searchParams.get("licenseId")` but detail page navigates with `?license=${licenseId}` (line 295 of detail page).
- **Fix:** Read `searchParams.get("license")` to match.

### Bug 3: Detail page has `is_active` column on `itam_license_allocations` but DB has no such column
**File:** `src/pages/helpdesk/assets/licenses/detail/[licenseId].tsx` line 48
- `.eq("is_active", true)` — the `itam_license_allocations` table has no `is_active` column. Query silently fails or returns nothing.
- **Fix:** Remove the `.eq("is_active", true)` filter; use `.is("deallocated_at", null)` instead.

### Bug 4: Detail page hardcodes ₹ currency symbol
**File:** `src/pages/helpdesk/assets/licenses/detail/[licenseId].tsx` line 206
- `₹${license.cost.toLocaleString()}` — should use system currency setting.
- **Fix:** Use `useSystemSettings` to get dynamic currency symbol.

### Bug 5: Detail page shows "License Type" twice in the details grid
**File:** `src/pages/helpdesk/assets/licenses/detail/[licenseId].tsx` lines 248-249 and 265-266
- Both columns show "License Type" — second one should be something else (e.g., "Status").

### Bug 6: Add License form stores `description`, `contact_person`, `phone` but never saves them to DB
**File:** `src/pages/helpdesk/assets/licenses/add-license.tsx` lines 56-68
- Form collects `description`, `contact_person`, `phone` but the insert mutation doesn't include these fields (DB doesn't have them either).
- **Fix:** Remove unused form fields to avoid user confusion.

### Bug 7: Add License `onSuccess` invalidates wrong query key
**File:** `src/pages/helpdesk/assets/licenses/add-license.tsx` line 73
- Invalidates `["itam-licenses"]` but list page uses `["itam-licenses-list"]`.
- **Fix:** Invalidate `["itam-licenses-list"]`.

### Bug 8: Allocate `onSuccess` also invalidates wrong key
**File:** `src/pages/helpdesk/assets/licenses/allocate.tsx` line 87
- Invalidates `["itam-licenses"]` but list/detail use `["itam-licenses-list"]` and `["itam-license-detail"]`.

### Bug 9: No edit functionality exists
- Detail page links to `/assets/licenses/add-license?edit=${licenseId}` but `add-license.tsx` never reads or handles edit mode.

---

## UI/UX Improvements

### 1. List page (`licenses/index.tsx`)
- Add `staleTime: 5 * 60 * 1000` to the query (missing, causes refetch on every mount).
- Make stat cards consistent height.
- Add row action menu (edit, delete, allocate) via dropdown — currently no way to delete/edit from list.

### 2. Detail page (`detail/[licenseId].tsx`)
- Make compact: reduce card padding, use smaller heading sizes.
- Add license key reveal/copy button instead of just showing dots.
- Fix allocation query to join with `users` table to show names.

### 3. Add License page (`add-license.tsx`)
- Remove phantom fields (`description`, `contact_person`, `phone`) that aren't stored.
- Add edit mode support reading from `?edit=` param.
- Make layout consistent with other forms in the app.

### 4. Allocate page (`allocate.tsx`)
- Fix query param mismatch.
- Compact card styling to match rest of app.

---

## Implementation Steps

1. **Fix route ordering** in `App.tsx` — move `add-license` and `allocate` before `:licenseId`.
2. **Fix list page** — add staleTime, add row actions (edit, delete, allocate), add `DropdownMenu` per row.
3. **Fix add-license page** — remove phantom fields, add edit mode, fix invalidation key, compact styling.
4. **Fix detail page** — remove duplicate "License Type", fix currency, fix allocation query, fix `is_active` filter, add license key copy, compact styling, use system currency.
5. **Fix allocate page** — fix query param from `licenseId` to `license`, fix invalidation keys, compact styling.
6. **Overall** — ensure consistent compact padding/spacing (`p-4` not `p-6`), `text-sm` fonts, `h-8`/`h-9` inputs matching rest of app.

