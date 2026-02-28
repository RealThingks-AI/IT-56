

# Make Asset Tags & User Names Clickable Across the Entire Asset App

## Problem
Asset tags and user names appear as plain text throughout the app. Users cannot click on them to navigate to the asset detail view or the employee/user view. This is a standard UX pattern in all ITAM/ITSM tools (ServiceNow, Freshservice, Snipe-IT, etc.) where identifiers are always hyperlinked.

## Solution
Add clickable navigation links (styled in `text-primary` with `hover:underline cursor-pointer`) for:
- **Asset tags** -- navigate to `/assets/detail/{asset_tag}`
- **User names** -- navigate to `/assets/employees?user={user_id}`

All clicks on these links will use `e.stopPropagation()` to prevent triggering parent row clicks.

## Files to Modify

### 1. `src/components/helpdesk/assets/AssetsList.tsx` (All Assets list view)
- **`assigned_to` cell** (line ~573-575): Wrap resolved user name in a clickable `<span>` that navigates to `/assets/employees?user={asset.assigned_to}`. Style: `text-primary hover:underline cursor-pointer`. Add `e.stopPropagation()`.
- **`purchased_from` / vendor cell** (line ~544-545): Make vendor name clickable, navigating to `/assets/vendors/detail/{vendor.id}`.
- **`created_by` cell** (line ~529-530): Make the resolved user name clickable to employee view.

### 2. `src/pages/helpdesk/assets/checkout.tsx`
- **Recent Checkouts table** (lines ~697-698): Make `asset_tag` cell clickable with `text-primary hover:underline`, navigating to `/assets/detail/{asset_tag}`. Add `e.stopPropagation()`.
- **Recent Checkouts table** (lines ~700-701): Make user name cell clickable, navigating to `/assets/employees?user={performed_by}`.

### 3. `src/pages/helpdesk/assets/checkin.tsx`
- **Asset list table** (line ~610): Make `assetTag` cell clickable to `/assets/detail/{assetTag}`. Style: `text-primary hover:underline cursor-pointer`.
- **Asset list table** (line ~612): Make `userName` cell clickable to `/assets/employees?user={assignedTo}`.
- **Recent Check Ins table** (lines ~730-731): Make `asset_tag` clickable to asset detail.
- **Recent Check Ins table** (lines ~733-734): Make user name clickable to employee view.

### 4. `src/pages/helpdesk/assets/detail/[assetId]/tabs/HistoryTab.tsx`
- **Performed by** (line ~243): Make the user name clickable to `/assets/employees?user={item.performed_by}`.
- **Old/new values** (lines ~234-236): When resolved values are user names (UUID detected), make them clickable.

### 5. `src/pages/helpdesk/assets/detail/[assetId]/tabs/DetailsTab.tsx`
- **Vendor name** (line ~65): Already clickable -- no change needed.
- **Checked Out To** (line ~93): Already clickable -- no change needed.

### 6. `src/pages/helpdesk/assets/AssetLogsPage.tsx`
- **"By" column** (line ~179): Make `resolveUser(log.performed_by)` clickable to employee view.
- Asset tag column already has clickable link -- no change needed.

### 7. `src/pages/helpdesk/assets/vendors/detail/[vendorId].tsx`
- **Assets tab** (line ~156): Asset tag is shown but not styled as a link. Add `text-primary` styling to the asset tag text.

### 8. `src/pages/helpdesk/assets/dashboard.tsx`
- The `FeedRow` component already has an `onClick` for the entire row. The user name column (col2) within feed rows showing checked-in/checked-out assets should be styled as `text-primary` to indicate clickability of the row.

## Technical Approach

### Clickable Pattern
For each clickable element, the pattern is:
```tsx
<span
  className="text-primary hover:underline cursor-pointer"
  onClick={(e) => {
    e.stopPropagation();
    navigate(`/assets/detail/${assetTag}`);
  }}
>
  {assetTag}
</span>
```

### User Name Click Pattern
```tsx
<span
  className="text-primary hover:underline cursor-pointer"
  onClick={(e) => {
    e.stopPropagation();
    navigate(`/assets/employees?user=${userId}`);
  }}
>
  {userName}
</span>
```

### Guards
- Only apply clickable styling when the value is not "---" or null
- For user names, only make clickable when we have the actual UUID (not just a display string)
- For asset tags, only make clickable when the tag is a real human-readable tag (not a raw UUID)

### `useUsersLookup` Enhancement
The `resolveUserName` hook currently returns just the name string. For pages that need both the name and ID for navigation, we'll use the existing `users` array from the hook to find the user ID alongside the name.

## Bugs & Issues Found

1. **Checkin recent transactions**: The "User" column shows `performed_by` (who did the action) instead of the actual user the asset was checked in from. Should show `old_value` resolved as user name where possible.
2. **Checkout recent transactions**: Same issue -- shows `performed_by` instead of the user it was checked out to. Should prefer `new_value`.
3. **AssetsList `assigned_to` column**: Currently returns plain text with no click handler -- this is the most critical fix since it's the main list view.
4. **HistoryTab user references**: User names in old/new values and performed_by are plain text -- should be clickable for quick navigation.

