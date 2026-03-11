

# Fix: Edge Function URL Parsing + SITE_URL Secret

## Root Cause

The `SITE_URL` Supabase secret is set to `it.realthingks.com` (without `https://`). The `new URL("/confirmation-result", "it.realthingks.com")` call throws `TypeError: Invalid URL` because the URL constructor requires a protocol scheme.

The edge function crashes and returns `{"error":"An error occurred..."}` instead of redirecting to the confirmation result page.

## Fix (2 changes)

### 1. Edge function: Add protocol normalization (belt-and-suspenders)
**File:** `supabase/functions/asset-confirmation/index.ts` (line 18-20)

Add `https://` prefix if missing from `SITE_URL`:

```typescript
function redirectToResult(params: Record<string, string | string[]>): Response {
  let baseUrl = Deno.env.get("SITE_URL") || "https://it.realthingks.com";
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    baseUrl = "https://" + baseUrl;
  }
  const url = new URL("/confirmation-result", baseUrl);
  // ... rest unchanged
}
```

### 2. Update `SITE_URL` secret to include protocol
Set the `SITE_URL` secret value to `https://it.realthingks.com` (with `https://`).

### 3. Redeploy the edge function
After both changes, redeploy `asset-confirmation`.

## Files to modify
| File | Change |
|------|--------|
| `supabase/functions/asset-confirmation/index.ts` | Add protocol normalization to `redirectToResult` |
| Supabase secret `SITE_URL` | Update value to `https://it.realthingks.com` |

