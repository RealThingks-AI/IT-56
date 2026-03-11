

# Fix Asset Confirmation Result Page

## Issues Found

### 1. Wrong base URL in edge function
**File:** `supabase/functions/asset-confirmation/index.ts` (line 19)
The fallback URL is `https://policy-palace-97.lovable.app` instead of `https://it.realthingks.com`. The `SITE_URL` env var may also not be set correctly.

**Fix:** Change the fallback to `https://it.realthingks.com` and also set the `SITE_URL` secret to `https://it.realthingks.com`.

### 2. Confirmation result page renders inside AuthProvider
The `/confirmation-result` and `/confirm-assets/:token` routes are inside `<AuthProvider>` which wraps the entire app. While `AuthProvider` doesn't force redirects itself, being inside it means the page tries to initialize auth, and on the production domain with sidebar visible (from screenshot), the `NotFound` page is being rendered with the full app chrome. External users (employees) who don't have portal accounts should see a clean standalone page with zero auth dependencies.

**Fix:** Move both `/confirmation-result` and `/confirm-assets/:token` routes **outside** the `AuthProvider` wrapper in `App.tsx` so they render as completely standalone pages with no Supabase auth initialization.

### 3. ConfirmationResult page needs to be fully standalone
The current `ConfirmationResult.tsx` component is already a standalone UI (no sidebar, no layout), which is good. But we need to ensure it stays that way and is completely decoupled from auth.

### 4. ConfirmAssets page also needs to work without auth
The `/confirm-assets/:token` page fetches data directly from the edge function without auth headers, which is correct. But it's still wrapped in `AuthProvider` unnecessarily.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/asset-confirmation/index.ts` | Change fallback URL from `policy-palace-97.lovable.app` to `it.realthingks.com` |
| `src/App.tsx` | Move `/confirmation-result` and `/confirm-assets/:token` routes outside the `AuthProvider` wrapper so they're fully public standalone pages |

## Technical Details

### App.tsx Route Restructure
```tsx
<BrowserRouter>
  <Routes>
    {/* Public standalone routes - NO auth, NO sidebar */}
    <Route path="/confirmation-result" element={
      <Suspense fallback={<PageLoader />}>
        <ConfirmationResult />
      </Suspense>
    } />
    <Route path="/confirm-assets/:token" element={
      <Suspense fallback={<PageLoader />}>
        <ConfirmAssets />
      </Suspense>
    } />
  </Routes>

  {/* Everything else inside AuthProvider */}
  <AuthProvider>
    <SystemSettingsProvider>
      <Routes>
        {/* ... all existing routes ... */}
      </Routes>
    </SystemSettingsProvider>
  </AuthProvider>
</BrowserRouter>
```

Actually, since `Routes` must be a single component, the approach is to render the public routes first and use a wrapper component that checks the path before rendering `AuthProvider`.

Simpler approach: Keep the current structure but add an early return in the route tree using a `PublicRoute` wrapper that bypasses auth:

```tsx
// In App.tsx, move these routes BEFORE the AuthProvider wrapper
// Use a separate Routes block for fully public pages
<BrowserRouter>
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Fully public - no auth needed */}
      <Route path="/confirmation-result" element={<ConfirmationResult />} />
      <Route path="/confirm-assets/:token" element={<ConfirmAssets />} />
      
      {/* Everything else goes through auth */}
      <Route path="/*" element={
        <AuthProvider>
          <SystemSettingsProvider>
            <AppErrorBoundary>
              <Routes>
                {/* all existing routes */}
              </Routes>
            </AppErrorBoundary>
          </SystemSettingsProvider>
        </AuthProvider>
      } />
    </Routes>
  </Suspense>
</BrowserRouter>
```

### Edge Function URL Fix
```typescript
// Line 19 - Before:
const baseUrl = Deno.env.get("SITE_URL") || "https://policy-palace-97.lovable.app";

// After:
const baseUrl = Deno.env.get("SITE_URL") || "https://it.realthingks.com";
```

### Set SITE_URL Secret
Set the `SITE_URL` Supabase secret to `https://it.realthingks.com` so the edge function always uses the correct domain.

