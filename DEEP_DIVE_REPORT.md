# NUCLEAR LEVEL INVESTIGATION: "User authentication required" Error in Production

## Executive Summary

The client-side authentication check at `src/app/(app)/candidates/new/page.tsx:57` is throwing the error `"User authentication required"` because `user?.user_id` is **undefined** or **null**. This indicates the `AuthContext` is failing to populate the user object correctly during initialization, likely due to a missing public `users` database record or a type conversion failure.

---

## AREA 1: Client-Side Auth Context Analysis

### Location
[src/lib/contexts/AuthContext.tsx:50-142](src/lib/contexts/AuthContext.tsx#L50-L142)

### How Auth Context Fetches User Session

**Method:** The context makes an API call to `/api/auth/session` (not direct Supabase client queries).

```tsx
// Line 74-78: AuthContext initialization
const response = await fetch('/api/auth/session', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
});
```

### Critical Issue: No UUID→TEXT Conversion on Client Side

**Line 94:** Context receives the user object from the API response and uses it directly:

```tsx
const { user, isMasterAdmin, isLocalAdmin, userRole, userPermissions, teamId, teamName } = result.data;
```

**The Problem:**
- The context expects `user.user_id` to be set by the API response
- If `getCurrentUser()` (on the server) fails to return a user object, the context will set `user: null`
- The context has **NO fallback handling** - it doesn't check if `user.user_id` is missing

### Type Definition (Lines 6-9)

```tsx
type UserWithRole = Omit<Database['public']['Tables']['users']['Row'], 'id'> & {
  user_id: string;  // Map 'id' column to 'user_id' for app consistency
  role_id: Database['public']['Tables']['roles']['Row'] | null;
};
```

The context assumes `user_id` will always be populated. **It has no defensive logic.**

### Loading State (Lines 86-92)

If the API response is not `success` or has no data, the context still sets `loading: false` without setting a `user` object:

```tsx
if (!result.success || !result.data) {
  setState((prev) => ({
    ...prev,
    loading: false,
  }));
  return;
}
```

**Result:** `user` remains `null`, causing `useAuth()` to return `{ user: null, loading: false }`.

---

## AREA 2: Create Candidate Client Page Check

### Location
[src/app/(app)/candidates/new/page.tsx:57-59](src/app/(app)/candidates/new/page.tsx#L57-L59)

### The Explicit User ID Check

```tsx
if (!user?.user_id) {
  throw new Error('User authentication required. Please log in again.');
}
```

### Execution Flow

1. **Line 15:** `const { user } = useAuth();` - Gets user from AuthContext
2. **Line 52-104:** `handleSubmit()` async function processes the form
3. **Line 57-59:** **THIS IS WHERE THE ERROR IS THROWN** when `user?.user_id` is falsy

### Why This Happens

The user object from `AuthContext` is `null` when:
- The API call to `/api/auth/session` returns `success: true` but `data: null`
- The server-side `getCurrentUser()` returns `null` (because no public user record exists)

**This is proof the client context is not receiving the user object from the server.**

---

## AREA 3: Database Trigger & User Record Creation

### Critical Finding: No "handle_new_user" Trigger Found

**Search Result:** No migrations contain `handle_new_user` or `on_auth_user_created` trigger.

**This is the root cause.** When users sign up or log in for the first time, **NO trigger automatically creates a record in the public `users` table**.

### What Should Happen

When a user authenticates with Supabase auth (`auth.users`), a trigger should automatically insert a record into `public.users` with:
- `id` (TEXT) = auth_user.id (UUID converted to TEXT)
- `email` = auth_user.email
- `team_id` = null (for new users)
- `role_id` = null
- `is_master_admin` = false

### Current Behavior

Instead, user records are **manually created** by explicit server-side operations:
- `createTeamAsLocalAdmin()` at [src/lib/supabase/auth-server.ts:205-214](src/lib/supabase/auth-server.ts#L205-L214)
- `createMasterAdmin()` at [src/lib/supabase/auth-server.ts:347-354](src/lib/supabase/auth-server.ts#L347-L354)

**Problem in Production:**
- Users who log in **without explicitly creating a team or being created as a master admin** will have NO public user record
- The auth token is valid (they can access protected routes)
- But the public `users` table has no row for them
- `getCurrentUser()` returns a fallback object (lines 75-98 in auth-server.ts)
- This fallback object goes back to the client via the API response

### Migration Files Checked

1. **20251222001_rls_helper_functions.sql** - Only RLS helper functions
2. **20251222_fix_rls_policies.sql** - RLS policies
3. **20251222006_fix_rls_service_role.sql** - RLS for service role
4. **20251221_cleanup_policies.sql** - Cleanup

**None of these create an automatic user insertion trigger.**

---

## AREA 4: Vercel/Production Cookie & Auth Configuration

### Client Configuration
[src/lib/supabase/client.ts:22-25](src/lib/supabase/client.ts#L22-L25)

```ts
export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);
```

**Analysis:**
- Uses `createBrowserClient` from `@supabase/ssr` (correct for SSR)
- No explicit cookie options set (relies on defaults)
- Cookies should be auto-managed by the SSR library

### Middleware Cookie Handling
[src/middleware.ts:17-29](src/middleware.ts#L17-L29)

```ts
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) =>
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        ),
    },
  }
);
```

**Analysis:**
- Middleware properly reads and sets cookies
- Response object should propagate cookies back to client
- **Potential Issue:** If Vercel's serverless environment has auth cookies with `secure: true` and `sameSite` restrictions, cross-origin requests might not include them

### Session Endpoint Cookie Refresh
[src/app/api/auth/session/route.ts:14-59](src/app/api/auth/session/route.ts#L14-L59)

```ts
export async function GET() {
  try {
    console.log('[API /session] Checking authentication...')
    const user = await getCurrentUser()

    if (!user) {
      console.log('[API /session] No authenticated user')
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      )
    }
```

**Critical Issue Found:**
- If `getCurrentUser()` returns `null` (no auth.user or no public user record), the API returns `success: true, data: null`
- The client treats this as "not authenticated" and `AuthContext` sets `user: null`
- But in Vercel, the auth cookies might be present in the middleware, yet the API response is `data: null`

**This is the disconnect:** The user is authenticated (has auth cookies), but the public user record doesn't exist.

### Production Cookie Issue (Vercel-Specific)

In production (Vercel), the cookie flow is:
1. User logs in → Supabase auth creates auth cookies
2. Request hits middleware → Cookies are read and refreshed
3. Client calls `/api/auth/session` → But might NOT include cookies if:
   - `sameSite: Strict` blocks cross-origin
   - `secure: true` but request is HTTP (unlikely in Vercel)
   - Cookie domain doesn't match the request domain

**Evidence:** The client makes the fetch with `credentials: 'include'` at line 74 of AuthContext.tsx, which should include cookies. But if Vercel's environment has domain mismatch issues, the cookies won't be sent.

---

## THE SMOKING GUN

### Sequence of Events in Production

1. **User signs up/logs in** → Supabase creates auth.users record
2. **No trigger exists** → No public.users record is created
3. **User navigates to `/candidates/new`** → Middleware passes them through (authenticated)
4. **Page mounts** → `AuthContext` calls `/api/auth/session`
5. **API endpoint runs**:
   - Calls `getCurrentUser()`
   - `supabase.auth.getUser()` returns the auth user (they have valid cookies)
   - Query `.eq('id', userIdString)` returns NO ROWS (public user record doesn't exist)
   - Returns fallback user object with `user_id: authUser.id` (lines 83-97 in auth-server.ts)
6. **API response** → Should include the fallback user with `user_id` set
7. **Client receives response** → AuthContext sets `user` to the fallback user object
8. **Client form renders** → Should have `user.user_id` available

### BUT IN PRODUCTION

If the fallback user object is not being returned, or if there's a **type conversion failure**, then:
- `getCurrentUser()` might return `null` instead of the fallback
- The API response would be `data: null`
- AuthContext would set `user: null`
- The form check `if (!user?.user_id)` would throw the error

---

## HYPOTHESIS: The Real Problem

### Most Likely Cause

The **fallback user object creation is failing silently**, or the **API response is not including the fallback user**.

Look at [src/lib/supabase/auth-server.ts:75-98](src/lib/supabase/auth-server.ts#L75-L98):

```ts
if (!userData) {
  console.warn('[getCurrentUser] ⚠️ No user record found in public.users table...')

  const fallbackUser: UserWithRole = {
    user_id: authUser.id.toString(),
    email: authUser.email || '',
    team_id: null,
    role_id: null,
    is_master_admin: false,
    status: 'active' as const,
    username: null,
    first_name: null,
    last_name: null,
    role: null,
    team: null,
  }
  console.log('[getCurrentUser] ⚠️ Returning fallback user object:', fallbackUser.user_id)
  return fallbackUser
}
```

**Questions:**
1. Is `authUser.id.toString()` working correctly, or is it returning an empty string?
2. Is the fallback user object being returned, but NOT included in the API response?
3. Is the `status` field value `'active'` causing a TypeScript type mismatch in production?

### Secondary Cause

The **UUID→TEXT conversion in the database query** might be failing in production:

```ts
const userIdString = authUser.id.toString()
const { data: userData, error } = await supabase
  .from('users')
  .select(...)
  .eq('id', userIdString)
  .single()
```

If `Supabase` is still performing UUID matching and `userIdString` is not matching the database UUID, the query returns no rows. But the fallback should still be triggered.

---

## DEBUGGING CHECKLIST

To find the exact disconnect:

1. **Check Browser Console Logs:**
   - Open DevTools → Network tab → Call `/api/auth/session`
   - Check the response JSON → Is `data.user` present?
   - Check `data.user.user_id` → Is it set?

2. **Check Server Logs (Vercel):**
   - Look for `[getCurrentUser]` console.log messages
   - Is the fallback user being created?
   - Is the API response including the fallback?

3. **Check Database:**
   - Query the `auth.users` table → Does the user exist?
   - Query the `public.users` table → Does the user exist?
   - If only in `auth.users`, the fallback should be triggered

4. **Check Cookie Transmission:**
   - In DevTools Network tab, check the `/api/auth/session` request
   - Are cookies being sent?
   - Are they being set in the response?

5. **Check for Type Mismatch:**
   - Does `userData` include a `status` field that doesn't match the `UserWithRole` type?
   - Is TypeScript coercion failing?

---

## Summary Table

| Area | Issue | Evidence | Impact |
|------|-------|----------|--------|
| **AuthContext** | No fallback if API returns `data: null` | Lines 86-92 | User object stays null |
| **New Candidate Page** | Explicit check `if (!user?.user_id)` | Line 57 | Throws "User authentication required" |
| **Database Trigger** | No automatic user record creation on signup | No `handle_new_user` trigger | Public user records missing |
| **Server-Side Auth** | Fallback user object implementation exists | Lines 75-98, auth-server.ts | Should work, but might not be returned |
| **API Session Endpoint** | Returns `data: null` if no user | Line 22-24, route.ts | Client can't distinguish auth vs no-record |
| **Vercel Cookies** | Possible domain/SameSite mismatch | Cookie options in middleware | Cookies might not be sent to API |

---

## Next Steps (When Ready to Fix)

1. **Verify the fallback user is being created** by checking server logs
2. **Verify the API response includes the fallback user** by checking the Network tab
3. **If fallback is NOT being returned**, add explicit logging to see where it fails
4. **If fallback IS being returned but type-mismatched**, fix the TypeScript type
5. **If cookies aren't being sent to `/api/auth/session`**, investigate Vercel domain/SameSite config
6. **Create a database trigger** to automatically insert public user records on auth signup (long-term fix)

