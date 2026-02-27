

# Licenses Section - Deep Optimization Plan

## Current State

The Licenses section is structurally sound (DB schema correct, RLS policies in place, routes ordered properly, navigation targets correct). The main issues are **UI/UX polish, missing features, and edge cases**.

## Bugs Found

1. **Add License form: "License Title" field has no page header** -- when navigating to `/assets/licenses/add-license`, the top bar just shows the sidebar but no breadcrumb or title indicating "Add License" vs "Edit License"
2. **Vendor dropdown shows empty when no vendors match** -- no "No vendors found" message or link to create one
3. **License type defaults to `perpetual` in DB but form sends `software` or `other`** -- mismatch; the list shows "License" as fallback text instead of the actual DB default "perpetual"
4. **Allocate page: user dropdown uses `user.id` (users table PK) but `itam_license_allocations.user_id` expects a UUID that should be `auth_user_id`** -- allocation inserts the wrong user ID, breaking the join in the detail page
5. **Detail page allocation table join `users:user_id(...)` will fail** because the allocation stores `users.id` but joins against `users` table expecting it matches -- this works structurally but the user_id stored may not correspond to what's expected
6. **No deallocation feature** in the detail page -- users can allocate but never deallocate seats
7. **Stats show "0" for Total Licenses** even when the stat card icon area is empty (no count rendered, just the icon)
8. **Form "Cost" field has no currency symbol prefix** -- inconsistent with the list view which shows the currency symbol

## Improvements to Implement

### A. Add License Form (`add-license.tsx`)
- Add a page header with title "Add License" / "Edit License" and back navigation
- Add currency symbol prefix to Cost field
- Add "No vendors available" message when vendor list is empty
- Tighten padding and ensure consistent spacing
- Add `vendor_id` clear option (allow "None")

### B. License List (`index.tsx`)
- Fix license type display: show "Perpetual" / "Software" / "Other" properly capitalized instead of raw DB values
- Ensure the "Total Licenses" stat card shows the count value (currently may show empty due to `0` being falsy)
- Add real-time subscription for live updates when licenses change

### C. License Detail (`detail/[licenseId].tsx`)
- Add **Deallocate** action button per allocation row to allow removing seat allocations
- Update `seats_allocated` count when deallocating
- Fix the allocation user display to handle edge cases better

### D. Allocate License (`allocate.tsx`)
- Fix user ID mapping: use `auth_user_id` instead of `users.id` for the allocation insert
- Add a page header with title and back navigation
- Show license name in header when pre-selected

### E. Routing
- Routes are already correctly ordered -- no changes needed

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/helpdesk/assets/licenses/add-license.tsx` | Add page header, currency prefix on cost, vendor empty state, clear vendor option |
| `src/pages/helpdesk/assets/licenses/index.tsx` | Fix license type capitalization, real-time subscription |
| `src/pages/helpdesk/assets/licenses/detail/[licenseId].tsx` | Add deallocate action per row, update seat count on deallocate |
| `src/pages/helpdesk/assets/licenses/allocate.tsx` | Fix user_id to use auth_user_id, add page header |

## Technical Details

### Allocate User ID Fix (Critical)
```typescript
// Current (wrong): uses users table PK
const { error } = await supabase.from("itam_license_allocations").insert({
  license_id: licenseId,
  user_id: userId, // This is users.id, not auth_user_id
});

// Fixed: use auth_user_id for consistency
const selectedUser = users.find(u => u.id === userId);
const { error } = await supabase.from("itam_license_allocations").insert({
  license_id: licenseId,
  user_id: selectedUser?.auth_user_id || userId,
});
```

### Deallocate Feature (Detail Page)
Add a button per allocation row that:
1. Sets `deallocated_at = now()` on the allocation record
2. Decrements `seats_allocated` on the license
3. Invalidates queries to refresh the UI

### License Type Display Fix
```typescript
// Capitalize and normalize license type display
const formatType = (type: string | null) => {
  if (!type) return "Perpetual";
  return type.charAt(0).toUpperCase() + type.slice(1);
};
```

