

# Add User Name Search to Asset Search Bars

## Problem
Searching for a user name like "deepak" in the All Assets search bar returns 0 results because the search only queries asset fields (name, asset_tag, serial_number, model, description). The `assigned_to` column stores UUIDs, not names, so user name matching requires a two-step lookup.

## Solution
Use a pre-query approach: when a search term is entered, first query the `users` table for matching names/emails, collect their IDs, then include those IDs in the asset filter using Supabase's `.or()` with an `.in()` condition.

## Files to Modify

### 1. `src/components/helpdesk/assets/AssetsList.tsx`
Both the **count query** and the **data query** need the same fix:

- Before building the `.or()` filter, query `users` for rows where `name` or `email` matches the search term
- Collect matching user IDs
- Append `assigned_to.in.(id1,id2,...)` to the existing `.or()` filter string

```typescript
// Pre-query: find user IDs matching the search term
let matchingUserIds: string[] = [];
if (filters.search) {
  const s = sanitizeSearchInput(filters.search);
  const { data: matchedUsers } = await supabase
    .from("users")
    .select("id")
    .or(`name.ilike.%${s}%,email.ilike.%${s}%`);
  matchingUserIds = (matchedUsers || []).map(u => u.id);
}

// Then in the .or() filter, add assigned_to.in.() if there are matches
let orFilter = `name.ilike.%${s}%,asset_tag.ilike.%${s}%,serial_number.ilike.%${s}%,model.ilike.%${s}%,description.ilike.%${s}%`;
if (matchingUserIds.length > 0) {
  orFilter += `,assigned_to.in.(${matchingUserIds.join(",")})`;
}
query = query.or(orFilter);
```

This change applies to both:
- The **count query** (line ~174-178)
- The **data query** (line ~214-218)

To avoid duplicating the user lookup, extract it into a shared helper or run it once and pass results to both queries via a shared state.

### 2. `src/components/helpdesk/assets/GlobalAssetSearch.tsx`
Apply the same pattern to the global search dropdown:
- Add a parallel `users` query alongside assets, categories, and departments
- Show matching users in a new "Users" command group with a Person icon
- Clicking a user result navigates to `/assets/allassets?search=<userName>` to show their assigned assets

## Technical Approach

Since both the count and data queries need the same user IDs, the cleanest approach is to:
1. Extract the user-matching logic into the query function itself (both queries already run independently via React Query)
2. Each query function will do a lightweight user lookup first, then build the combined filter

The user lookup query is fast (small table, indexed) and cached by React Query with `staleTime`, so the extra round-trip is minimal.

