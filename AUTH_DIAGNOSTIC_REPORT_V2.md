# Authentication Diagnostic Report V2
## Data Type Mismatch & Email Verification Analysis

**Root Cause Hypothesis:** UUID vs TEXT mismatch between `auth.users.id` (UUID) and `public.users.id` (TEXT) causing RLS policy failures in database function calls.

---

## 1. Locate the Error

### Primary Error Location
**File:** [src/app/api/candidates/route.ts](src/app/api/candidates/route.ts)
**Function:** `POST /api/candidates`
**Line:** 167

### Exact Code Block:
```typescript
export async function POST(request: NextRequest) {
  try {
    console.log('[POST /candidates] Checking authentication...')
    // 1. Authenticate
    const user = await getCurrentUser()
    if (!user) {
      console.log('[POST /candidates] User not authenticated')
      return NextResponse.json(
        { success: false, error: 'User authentication required. Please log in again.' },  // Line 167
        { status: 401 }
      )
    }

    console.log('[POST /candidates] User authenticated:', user.user_id)

    // 2. Get team context
    const teamContext = await getTeamContext(user.user_id)

    // 3. Check permissions (skip if master admin or local admin)
    if (!teamContext.isMasterAdmin && !teamContext.isLocalAdmin) {
      const hasPermission = await checkPermission(user.user_id, 'candidates.create')
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    // ... validation code omitted ...

    // 5. Create candidate
    if (!teamContext.teamId) {
      return NextResponse.json(
        { success: false, error: 'Team ID required' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    console.log('[POST /candidates] Inserting candidate:', {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      teamId: teamContext.teamId,
      userId: user.user_id,
    })

    const { data: candidate, error } = await (supabase
      .from('candidates') as any)
      .insert({
        team_id: teamContext.teamId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email && data.email !== '' ? data.email : null,
        phone: data.phone && data.phone !== '' ? data.phone : null,
        location: data.currentLocation && data.currentLocation !== '' ? data.currentLocation : null,
        skills: data.skills && data.skills.length > 0 ? data.skills : [],
        experience_years: data.experienceYears || null,
        current_title: data.currentTitle && data.currentTitle !== '' ? data.currentTitle : null,
        current_employer: data.currentCompany && data.currentCompany !== '' ? data.currentCompany : null,
        status: data.status,
        created_by: user.user_id,
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /candidates] Insert error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create candidate: ' + error.message },
        { status: 400 }
      )
    }

    console.log('[POST /candidates] ✅ Candidate created successfully:', candidate.id)
    return NextResponse.json({
      success: true,
      data: candidate,
    })
  } catch (error) {
    console.error('Create candidate API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
```

### Other Locations with Same Error String:
1. **[src/app/(app)/candidates/new/page.tsx:58](src/app/(app)/candidates/new/page.tsx#L58)** - Client-side check before API call:
   ```typescript
   if (!user?.user_id) {
     throw new Error('User authentication required. Please log in again.');
   }
   ```

2. **[src/app/api/auth/team-setup/route.ts:21](src/app/api/auth/team-setup/route.ts#L21)** - Team setup endpoint:
   ```typescript
   if (!user) {
     console.log('[POST /team-setup] User not authenticated')
     return NextResponse.json(
       { error: 'User authentication required' },
       { status: 401 }
     )
   }
   ```

3. **[src/app/(app)/clients/new/page.tsx:51](src/app/(app)/clients/new/page.tsx#L51)** - Client-side for clients:
   ```typescript
   alert('User authentication required. Please log in again.');
   ```

### Session Retrieval Method:
All endpoints use **`getCurrentUser()`** function which internally calls:
```typescript
const {
  data: { user: authUser },
  error: authError,
} = await supabase.auth.getUser()
```
This is `supabase.auth.getUser()` - the proper Supabase Auth method, NOT `getSession()`.

---

## 2. Check User ID Types in Code

### Database Type Definition
**File:** [src/types/database.ts](src/types/database.ts)
**Lines:** 122-152

```typescript
users: {
  Row: {
    id: string  // TEXT primary key (copy of auth.users.id as TEXT)
    email: string  // UNIQUE
    team_id: string | null  // FK to teams (NULL for master admins)
    role_id: string | null  // FK to roles (NULL for master admins or unassigned)
    is_master_admin: boolean  // TRUE = ignore team_id/role_id, access all teams
    created_at: string
    updated_at: string
  }
  Insert: {
    id: string  // Must be provided (auth.users.id)
    email: string
    team_id?: string | null
    role_id?: string | null
    is_master_admin?: boolean
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    email?: string
    team_id?: string | null
    role_id?: string | null
    is_master_admin?: boolean
    created_at?: string
    updated_at?: string
  }
}
```

### Type Annotation Comment (Critical):
**From lines 5-8 of database.ts:**
```typescript
/**
 * CRITICAL: Column names must match the actual schema:
 * - users.id (TEXT) - NOT user_id or user_id
 * - teams.id (UUID)
 * - roles.id (UUID)
 *
 * Multi-tenant: team_id is the primary tenant identifier
 * Auth: users.id is a TEXT copy of auth.users.id (UUID cast to TEXT)
 */
```

### Type Used in Server Code
**File:** [src/lib/supabase/auth-server.ts](src/lib/supabase/auth-server.ts)
**Lines:** 20-77

The `getCurrentUser()` function:
1. Calls `supabase.auth.getUser()` which returns `authUser.id` as **UUID type** from auth schema
2. Then queries the `users` table with: `.eq('id', authUser.id)`
3. Maps result to `UserWithRole` type which defines `user_id: string`

**THE MISMATCH:**
- `authUser.id` from Supabase Auth is a **UUID** (native Postgres UUID type)
- `users.id` in public schema is **TEXT** (stringified UUID)
- When comparing in queries, this can cause type mismatches in RLS functions

### UserWithRole Interface Definition
**From database.ts, lines 619-637:**
```typescript
export interface UserWithRole {
  user_id: string  // Copy of users.id (TEXT)
  email: string
  team_id: string | null
  role_id: string | null
  is_master_admin: boolean
  created_at?: string
  updated_at?: string
  role?: {
    role_id: string
    role_name: string
    is_admin: boolean  // FIXED: was is_admin_role, now matches database column name
  } | null
  team?: {
    team_id: string
    team_name: string
    company_name?: string
  } | null
}
```

---

## 3. Check for Email Verification Logic

### Location 1: Middleware
**File:** [src/middleware.ts](src/middleware.ts)
**Lines:** 51-61

```typescript
// Check email verification - skip for OAuth/social login users
// OAuth users (Google, etc.) are already verified by the provider
const isOAuthUser = user.app_metadata?.providers?.some((p: string) => p !== 'email');

if (!user.email_confirmed_at && !isOAuthUser) {
  // Allow access to verification routes, but redirect others
  if (!pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/auth/verify-email', request.url));
  }
  return response;
}
```

**What it does:**
- Checks `user.email_confirmed_at` from Supabase Auth object
- For non-OAuth users with unconfirmed email, redirects to `/auth/verify-email`
- Allows OAuth users to bypass this check

### Location 2: Client-Side Form Check
**File:** [src/app/(app)/candidates/new/page.tsx](src/app/(app)/candidates/new/page.tsx)
**Lines:** 57-59

```typescript
if (!user?.user_id) {
  throw new Error('User authentication required. Please log in again.');
}
```

This is NOT an email verification check, but an authentication check. However, the middleware (Location 1) prevents unverified email users from reaching this page in the first place.

### Location 3: Auth Context Check (Implicit)
The email verification check is implicitly enforced by middleware redirecting to `/auth/verify-email` page, which exists at:
- **File:** [src/app/auth/verify-email/page.tsx](src/app/auth/verify-email/page.tsx)

### Summary of Email Verification Locations:
| Location | Type | Check | Redirect Target |
|----------|------|-------|-----------------|
| **middleware.ts:55** | Route guard | `!user.email_confirmed_at && !isOAuthUser` | `/auth/verify-email` |
| **middleware.ts** | OAuth bypass | `isOAuthUser` truthy | (no redirect) |
| **N/A** | Server action | (no explicit check) | N/A |
| **candidates/new/page.tsx:57** | Client check | `!user?.user_id` | Error thrown |

---

## 4. Middleware Session Handling

**File:** [src/middleware.ts](src/middleware.ts)
**Lines:** 1-92

### Full Middleware Code:
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/auth/login', '/auth/signup', '/auth/reset-password', '/auth/callback', '/auth/verify-email'];
const ADMIN_ROUTES = ['/admin'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  // API routes should not redirect - they should just refresh the session
  const isApiRoute = pathname.startsWith('/api');

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

  const { data: { user } } = await supabase.auth.getUser();

  // For API routes, just return the response with refreshed session cookies
  if (isApiRoute) {
    return response;
  }

  // Public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    if (user && !pathname.startsWith('/auth/callback')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return response;
  }

  // Require authentication
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Check email verification - skip for OAuth/social login users
  // OAuth users (Google, etc.) are already verified by the provider
  const isOAuthUser = user.app_metadata?.providers?.some((p: string) => p !== 'email');

  if (!user.email_confirmed_at && !isOAuthUser) {
    // Allow access to verification routes, but redirect others
    if (!pathname.startsWith('/auth/')) {
      return NextResponse.redirect(new URL('/auth/verify-email', request.url));
    }
    return response;
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('is_master_admin, role:roles(is_admin)')
    .eq('id', user.id)
    .single();

  // Admin routes: Master admin only
  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!profile?.is_master_admin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### SSR Pattern Compliance:
✅ **YES - Follows Supabase SSR pattern correctly:**
- **Lines 22-26:** Uses `request.cookies.getAll()` for cookie retrieval
- **Lines 23-25:** Uses `response.cookies.set()` with `setAll()` callback pattern
- **Line 31:** Calls `supabase.auth.getUser()` to refresh session
- **Line 34-36:** Returns response with refreshed cookies for API routes

### Explicit Cookie Refresh:
✅ **YES - Explicitly handled:**
- **Line 31:** `const { data: { user } } = await supabase.auth.getUser();` refreshes the session
- **Lines 22-26:** Cookie handlers automatically set refreshed cookies in response
- **Lines 34-36:** For API routes, returns early with refreshed session cookies (no redirect)

---

## 5. Database Functions (RLS Helpers)

**File:** [supabase/migrations/20251222001_rls_helper_functions.sql](supabase/migrations/20251222001_rls_helper_functions.sql)

### Function 1: `is_master_admin`
**Lines:** 4-6
```sql
CREATE OR REPLACE FUNCTION is_master_admin(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_master_admin FROM users WHERE id = user_id::TEXT), false)
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Type Analysis:**
- **Accepts:** `UUID` parameter
- **Casts:** `user_id::TEXT` before querying (converts UUID to TEXT)
- **Query:** Looks up `users.id` (TEXT column) with TEXT cast
- **CRITICAL ISSUE:** Function accepts UUID, casts to TEXT. This is correct BUT relies on implicit UUID→TEXT cast.

### Function 2: `get_user_team_id`
**Lines:** 9-11
```sql
CREATE OR REPLACE FUNCTION get_user_team_id(user_id UUID) RETURNS UUID AS $$
  SELECT team_id FROM users WHERE id = user_id::TEXT
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Type Analysis:**
- **Accepts:** `UUID` parameter
- **Casts:** `user_id::TEXT` before querying
- **Returns:** `UUID` (the `team_id` column is UUID)
- **Status:** Explicit cast present - SAFE

### Function 3: `is_membership_approved`
**Lines:** 14-21
```sql
CREATE OR REPLACE FUNCTION is_membership_approved(user_id UUID, team_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_memberships
    WHERE team_memberships.user_id = user_id::TEXT
      AND team_memberships.team_id = $2
      AND team_memberships.status = 'approved'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Type Analysis:**
- **Accepts:** `UUID` for user_id, `UUID` for team_id
- **Casts:** `user_id::TEXT` (converts to TEXT for comparison with team_memberships.user_id)
- **team_id comparison:** Uses `$2` directly (UUID to UUID - both UUID types)
- **Status:** User ID cast explicit, team_id comparison is type-safe

**Related Schema:**
From [supabase/migrations/20251222000_add_team_memberships.sql](supabase/migrations/20251222000_add_team_memberships.sql):
```sql
CREATE TABLE team_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  -- ... other columns ...
);
```

**CRITICAL FINDING:** `team_memberships.user_id` is **TEXT**, matching the explicit cast in the function.

### Function 4: `is_admin_for_team`
**Lines:** 24-31
```sql
CREATE OR REPLACE FUNCTION is_admin_for_team(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = user_id::TEXT
      AND r.is_admin = true
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Type Analysis:**
- **Accepts:** `UUID` parameter
- **Casts:** `user_id::TEXT` before querying (converts UUID to TEXT for `users.id` comparison)
- **Join:** `roles.id` is UUID, matches on `users.role_id` (also UUID) - type-safe
- **Status:** Explicit cast present - SAFE

### Grant Statements
**Lines:** 34-37
```sql
GRANT EXECUTE ON FUNCTION is_master_admin(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_team_id(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_membership_approved(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_admin_for_team(UUID) TO authenticated, service_role;
```

**Analysis:** Functions are callable by authenticated users and service role. This is correct.

### Summary Table

| Function | Accepts | Casts | Safe? | Issue |
|----------|---------|-------|-------|-------|
| `is_master_admin()` | UUID | `user_id::TEXT` ✓ | YES | None |
| `get_user_team_id()` | UUID | `user_id::TEXT` ✓ | YES | None |
| `is_membership_approved()` | UUID, UUID | `user_id::TEXT` ✓, `team_id` direct | YES | None |
| `is_admin_for_team()` | UUID | `user_id::TEXT` ✓ | YES | None |

**CONCLUSION:** All RLS helper functions properly cast UUID to TEXT before querying the `users` table. The casts are explicit and correct.

---

## 6. The "Create Candidate" Action

**File:** [src/app/api/candidates/route.ts](src/app/api/candidates/route.ts)
**Function:** `POST` handler (lines 159-265)

### Session Check Sequence:
```
1. Line 163: const user = await getCurrentUser()
2. Line 164-169: if (!user) { return 401 error }
3. Line 175: const teamContext = await getTeamContext(user.user_id)
4. Line 216: const supabase = await createServerClient()
5. Line 226-243: await supabase.from('candidates').insert(...)
```

### Try/Catch Wrapping:
✅ **YES - Wrapped in try/catch:**
```typescript
export async function POST(request: NextRequest) {
  try {
    // ... all logic inside ...
  } catch (error) {
    console.error('Create candidate API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
```

### Session Check Position:
✅ **BEFORE Supabase client initialization:**
- Line 163: `getCurrentUser()` called first
- Line 216: `createServerClient()` called after session validation

### Error Handling Chain:
1. **Line 163-169:** Auth check → returns 401 if no user
2. **Line 174-186:** Team context & permission checks → returns 403 if forbidden
3. **Line 189-204:** Request body validation → returns 400 if invalid
4. **Line 245-250:** Database insert error → returns 400 with error message
5. **Line 258-263:** Catch-all exception handler → returns 500

### Critical Data Flow:
```typescript
const { data: candidate, error } = await (supabase
  .from('candidates') as any)
  .insert({
    team_id: teamContext.teamId,        // UUID
    first_name: data.firstName,         // string
    last_name: data.lastName,           // string
    email: data.email && data.email !== '' ? data.email : null,
    phone: data.phone && data.phone !== '' ? data.phone : null,
    location: data.currentLocation && data.currentLocation !== '' ? data.currentLocation : null,
    skills: data.skills && data.skills.length > 0 ? data.skills : [],
    experience_years: data.experienceYears || null,
    current_title: data.currentTitle && data.currentTitle !== '' ? data.currentTitle : null,
    current_employer: data.currentCompany && data.currentCompany !== '' ? data.currentCompany : null,
    status: data.status,
    created_by: user.user_id,           // string (users.id)
  })
  .select()
  .single()
```

**Type Mismatch Risk:**
- `created_by: user.user_id` is `string` (TEXT from database mapping)
- Database column `candidates.created_by` is `string | null` (FK to users.id which is TEXT)
- **This is TYPE-SAFE** - strings match

### Where RLS Policy Applies:
The RLS policy on `candidates` table uses:
```sql
CREATE POLICY candidates_own_team ON candidates
  USING (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  )
  WITH CHECK (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  );
```

**Policy Evaluation:**
1. `auth.uid()` returns UUID from Supabase Auth
2. `is_master_admin(auth.uid())` casts to TEXT → SAFE ✓
3. `get_user_team_id(auth.uid())` casts to TEXT → SAFE ✓
4. `is_membership_approved(auth.uid(), team_id)` casts user_id to TEXT → SAFE ✓

---

## Root Cause Summary Table

| Component | Type System | Issue | Impact |
|-----------|------------|-------|--------|
| **users.id** | TEXT | Stores auth.users.id as stringified UUID | Required for all lookups |
| **auth.uid()** | UUID | Native Postgres UUID type | Must cast to TEXT |
| **RLS functions** | UUID→TEXT cast | Explicit casts present in all functions | Conversions are safe |
| **Middleware** | Supabase SSR | Proper cookie handling | Session refresh works |
| **Email verification** | Middleware gate | Checked before API routes | Redirects to /auth/verify-email |
| **Create candidate** | Try/catch wrapped | Session check BEFORE DB init | Proper error handling |

---

## Critical Findings

1. ✅ **RLS Helper Functions:** All use explicit `::TEXT` casts - type-safe
2. ✅ **Middleware:** Proper SSR pattern with cookie refresh
3. ✅ **Create Candidate:** Wrapped in try/catch, session checked first
4. ⚠️ **Email Verification:** Currently blocks non-OAuth users from all authenticated routes
5. ⚠️ **Users Table:** Uses TEXT for UUID storage (intentional design, but different from standard UUID columns)

---

## Data Type Mismatch Details

### The Mismatch Scenario:
```
auth.users.id      → UUID (native Postgres type)
public.users.id    → TEXT (stringified)
team_memberships.user_id → TEXT (matches users.id)

When RLS evaluates:
1. auth.uid() returns UUID
2. Passed to is_membership_approved(user_id UUID, ...)
3. Function casts: user_id::TEXT
4. Comparison: TEXT = TEXT (after cast)
✓ TYPE-SAFE
```

### Potential Issue Vectors:
1. ⚠️ If middleware calls `.eq('id', user.id)` without string conversion
2. ⚠️ If any RLS function forgot the `::TEXT` cast
3. ⚠️ If team_memberships queries don't use TEXT user_id

### Verification:
All checked - casts are in place. The issue causing "User authentication required" is likely:
- Session cookie not being properly set/refreshed
- `getCurrentUser()` returning null despite user being authenticated
- Email verification redirect happening before reaching the API endpoint

