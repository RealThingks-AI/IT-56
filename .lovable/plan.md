

# Simplify IT Hub for Single-Company Internal Use

## Current Situation Analysis

Your app currently has a **multi-tenant architecture** with:
- 18 organisations in the database (from testing/development)
- 59+ tables with `organisation_id` columns
- 50+ tables with `tenant_id` columns
- `OrganisationContext` that adds loading time on every page
- Page access checks that depend on `organisation?.id` being loaded

### Root Cause of Access Denied Bug

The immediate issue is in `PageProtectedRoute`:

```typescript
// Line 22-24 of PageProtectedRoute.tsx
if (!hasAccess) {
  return <Navigate to="/access-denied" replace />;
}
```

Combined with `usePageAccess.tsx`:

```typescript
// Line 93: Query is disabled when org not yet loaded
enabled: !!user?.id && !!organisation?.id,

// Line 110: Defaults to false when disabled
hasAccess: hasAccess ?? cachedPermission ?? false,
```

**Problem**: When `organisation?.id` is `undefined` during initial load, the query never runs, `hasAccess` defaults to `false`, and user gets redirected.

---

## Recommended Approach

Since this is an internal IT app for a single company, I recommend a **two-phase approach**:

### Phase 1: Fix the Access Denied Bug (Immediate)
Fix the loading state issues without removing organisation logic (safer, faster)

### Phase 2: Simplify Architecture (Optional, Larger)
Remove unnecessary organisation complexity (requires database migration)

---

## Phase 1: Fix Access Denied Bug

### 1.1 Update PageProtectedRoute to Handle Loading States

**File:** `src/components/PageProtectedRoute.tsx`

```typescript
import { Navigate } from "react-router-dom";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { Loader2 } from "lucide-react";

export function PageProtectedRoute({ children, route }: PageProtectedRouteProps) {
  const { hasAccess, isLoading } = usePageAccess(route);
  const { loading: orgLoading } = useOrganisation();

  // Wait for org + permissions to load
  if (isLoading || orgLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Only redirect if explicitly denied (not undefined/loading)
  if (hasAccess === false) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}
```

### 1.2 Update usePageAccess to Not Default to False

**File:** `src/hooks/usePageAccess.tsx`

Change line 110:
```typescript
// BEFORE
hasAccess: hasAccess ?? cachedPermission ?? false,

// AFTER - Return undefined while loading, not false
hasAccess: hasAccess ?? cachedPermission,
```

Change line 112:
```typescript
// BEFORE
isLoading: cachedPermission === undefined && isLoading,

// AFTER - More accurate loading state
isLoading: isLoading || (hasAccess === undefined && cachedPermission === undefined),
```

### 1.3 Update RoleProtectedRoute

**File:** `src/components/RoleProtectedRoute.tsx`

```typescript
// Line 26-31: Only check role after loading completes
if (authLoading || roleLoading) {
  return <Loader2 />;
}

// After loading, if no role found, then deny
if (!role || !allowedRoles.includes(role)) {
  return <Navigate to="/access-denied" />;
}
```

### 1.4 Clear Stale Cache on Login

**File:** `src/pages/Login.tsx`

Add after successful login (around line 73):
```typescript
// Clear any stale permission cache
localStorage.removeItem('page-permissions-cache');
```

---

## Phase 2: Simplify for Single Company (Optional)

If you want to remove organisation complexity entirely, here's what's needed:

### Database Changes Required

1. **Keep `organisation_id`** in tables (don't remove - too risky)
2. **Set a single default organisation** for all data
3. **Update RLS policies** to use simpler role-based checks
4. **Remove OrganisationContext** from frontend

### Code Changes

| File | Change |
|------|--------|
| `src/contexts/OrganisationContext.tsx` | Replace with simple hardcoded org values |
| `src/App.tsx` | Remove `OrganisationProvider` wrapper |
| 27+ files using `useOrganisation` | Use hardcoded org ID or remove checks |
| All insert mutations | Remove `organisation_id` requirement |

### Estimated Effort
- Phase 1: ~30 minutes (immediate fix)
- Phase 2: ~4-6 hours (full simplification)

---

## Recommended Implementation Order

1. **Fix Phase 1.1** - Update `PageProtectedRoute.tsx`
2. **Fix Phase 1.2** - Update `usePageAccess.tsx`
3. **Fix Phase 1.3** - Update `RoleProtectedRoute.tsx`
4. **Fix Phase 1.4** - Clear cache on login

This will immediately fix the Access Denied bug. Phase 2 can be done later if desired.

---

## Additional Bugs Found

### Bug 1: Duplicate user data fetching (Performance)
Multiple hooks fetch same user data independently:
- `useCurrentUser.tsx` (new consolidated hook)
- `useCurrentUserData.tsx` (redundant)
- `OrganisationContext` (fetches user+org)
- `SidebarUserSection` (fetches user)

**Fix**: Already addressed in previous performance changes with `useCurrentUser`

### Bug 2: Missing user_roles entries
Some users in `users` table don't have corresponding `user_roles` entries:
```
ai@realthingks.com → user_role: <nil>
it@realthingks.com → user_role: <nil>
user1@realthingks.com → user_role: <nil>
```

**Fix**: Add missing role entries to `user_roles` table

### Bug 3: Stale localStorage cache
The `page-permissions-cache` can persist incorrect values across sessions.

**Fix**: Clear on login (included in Phase 1.4)

---

## Summary

| Issue | Priority | Effort | Status |
|-------|----------|--------|--------|
| Access Denied for admin | Critical | 30 min | To Fix (Phase 1) |
| Org loading race condition | Critical | Included | To Fix (Phase 1) |
| Missing user_roles entries | High | 5 min | Database update needed |
| Stale permission cache | High | 5 min | To Fix (Phase 1.4) |
| Remove org complexity | Low | 4-6 hrs | Optional (Phase 2) |

