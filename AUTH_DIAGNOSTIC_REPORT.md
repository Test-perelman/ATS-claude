# Authentication Diagnostic Report
## Persistent "User authentication required" Error Analysis

---

## 1. The Error Source

### Location: `/api/candidates` Route Handler
**File:** [src/app/api/candidates/route.ts:167](src/app/api/candidates/route.ts#L167)

**Exact Error Message:**
```
'User authentication required. Please log in again.'
```

**Function:** `POST /api/candidates` (line 159-265)

**Triggering Condition:**
```typescript
const user = await getCurrentUser()
if (!user) {
  console.log('[POST /candidates] User not authenticated')
  return NextResponse.json(
    { success: false, error: 'User authentication required. Please log in again.' },
    { status: 401 }
  )
}
```

### How User/Session is Retrieved:
The function calls `getCurrentUser()` from [src/lib/supabase/auth-server.ts](src/lib/supabase/auth-server.ts#L20)

**Key code in `getCurrentUser()`** (lines 20-107):
```typescript
const supabase = await createServerClient()

const {
  data: { user: authUser },
  error: authError,
} = await supabase.auth.getUser()

if (authError) {
  console.error('[getCurrentUser] Auth error:', authError.message)
  return null
}

if (!authUser) {
  console.log('[getCurrentUser] No auth user - not logged in')
  return null
}
```

**Method:** Uses `supabase.auth.getUser()` via the server-side Supabase client. This retrieves the authenticated user from Supabase Auth and then queries the `users` table to enrich with team/role data.

---

## 2. Middleware Configuration

**File:** [src/middleware.ts](src/middleware.ts)

### Full Content:
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

### `createServerClient` Configuration:
- **Cookies handling:** Uses `getAll()` and `setAll()` pattern from `@supabase/ssr`
- **Cookie retrieval:** `getAll: () => request.cookies.getAll()`
- **Cookie setting:** `setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))`
- **Important note:** For API routes, middleware explicitly returns early without forcing authentication - just refreshes session cookies
- **Email verification check:** Lines 51-61 check `!user.email_confirmed_at` for non-OAuth users and redirect to `/auth/verify-email`

---

## 3. Server-Side Client Setup

**File:** [src/lib/supabase/server.ts](src/lib/supabase/server.ts)

### Full Content:
```typescript
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Create a Supabase client for use in Server Components, Server Actions, and Route Handlers
 * Uses Next.js cookies for proper authentication handling
 */
export async function createClient() {
  const cookieStore = cookies()

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Alias for compatibility
export const createServerClient = createClient

/**
 * Create a Supabase Admin client for privileged operations
 * Uses service role key for admin operations (bypasses RLS)
 */
export async function createAdminClient(): Promise<SupabaseClient<Database>> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "public" }
    }
  )
}
```

### Cookie Handling:
- **Yes**, uses `cookies()` from `next/headers`
- Implementation follows SSR pattern with `getAll()` and `setAll()` methods
- Try-catch in `setAll()` gracefully handles Server Component context where cookies might be read-only

### Email Verification Check:
**Crucial finding:** There is NO logic in `server.ts` that checks `user.email_confirmed_at`.

However, this check exists in:
1. **Middleware** ([src/middleware.ts:55](src/middleware.ts#L55)):
   ```typescript
   if (!user.email_confirmed_at && !isOAuthUser) {
     if (!pathname.startsWith('/auth/')) {
       return NextResponse.redirect(new URL('/auth/verify-email', request.url));
     }
   }
   ```

2. **getCurrentUser function** in [src/lib/supabase/auth-server.ts](src/lib/supabase/auth-server.ts) - Does NOT explicitly check email verification; it returns the user regardless of email_confirmed_at status.

---

## 4. Client-Side Client Setup

**File:** [src/lib/supabase/client.ts](src/lib/supabase/client.ts)

### Full Content:
```typescript
/**
 * Browser Supabase Client
 * USE ONLY in client components ('use client')
 *
 * For server-side operations (API routes, server actions, server components):
 * Import from '@/lib/supabase/server' instead
 */
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Browser client for use in client components
 * Handles cookie-based auth automatically via @supabase/ssr
 */
export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

// Typed helper functions for write operations
export async function typedInsert<T extends keyof Database['public']['Tables']>(
  table: T,
  payload: Database['public']['Tables'][T]['Insert']
) {
  const query = supabase.from(table) as any;
  return query.insert(payload).select().single() as Promise<{
    data: Database['public']['Tables'][T]['Row'] | null;
    error: any;
  }>;
}

export async function typedUpdate<T extends keyof Database['public']['Tables']>(
  table: T,
  idColumn: keyof Database['public']['Tables'][T]['Row'],
  idValue: string,
  payload: Database['public']['Tables'][T]['Update']
) {
  const query = supabase.from(table) as any;
  return query.update(payload).eq(idColumn as string, idValue).select().single() as Promise<{
    data: Database['public']['Tables'][T]['Row'] | null;
    error: any;
  }>;
}

export async function typedUpsert<T extends keyof Database['public']['Tables']>(
  table: T,
  payload: Database['public']['Tables'][T]['Insert'] | Database['public']['Tables'][T]['Insert'][],
  options?: { onConflict?: string; ignoreDuplicates?: boolean }
) {
  const query = supabase.from(table) as any;
  return query.upsert(payload, options) as Promise<{
    data: Database['public']['Tables'][T]['Row'][] | null;
    error: any;
  }>;
}
```

### Client Instantiation:
- **Singleton pattern**: `export const supabase = createBrowserClient<Database>(...)` is a module-level singleton
- **Created once** when the module is imported, reused across all client component instances
- Automatically handles cookie-based authentication via `@supabase/ssr`

---

## 5. The Failing Action (Create Candidate)

**Primary Location:** [src/app/api/candidates/route.ts](src/app/api/candidates/route.ts) (POST handler, lines 159-265)

**Alternative client-side call location:** [src/app/(app)/candidates/new/page.tsx](src/app/(app)/candidates/new/page.tsx) (line 81)

### How Client-Side Initiates Create:
```typescript
// From src/app/(app)/candidates/new/page.tsx, line 57-59
if (!user?.user_id) {
  throw new Error('User authentication required. Please log in again.');
}

// Line 81: Calls API endpoint
const response = await apiPost('/api/candidates', candidateData);
```

### API Route Initialization:
```typescript
// From src/app/api/candidates/route.ts, POST handler
export async function POST(request: NextRequest) {
  try {
    console.log('[POST /candidates] Checking authentication...')

    // 1. Authenticate using getCurrentUser
    const user = await getCurrentUser()  // Line 163

    if (!user) {
      console.log('[POST /candidates] User not authenticated')
      return NextResponse.json(
        { success: false, error: 'User authentication required. Please log in again.' },
        { status: 401 }
      )
    }

    // 2. Get team context
    const teamContext = await getTeamContext(user.user_id)  // Line 175

    // 3. Check permissions
    if (!teamContext.isMasterAdmin && !teamContext.isLocalAdmin) {
      const hasPermission = await checkPermission(user.user_id, 'candidates.create')
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    // ... validation ...

    // 4. Create candidate
    const supabase = await createServerClient()  // Line 216

    const { data: candidate, error } = await (supabase
      .from('candidates') as any)
      .insert({
        team_id: teamContext.teamId,
        first_name: data.firstName,
        // ... other fields ...
        created_by: user.user_id,
      })
      .select()
      .single()
```

### Authentication Check Sequence:
1. **Line 163:** Call `getCurrentUser()` which:
   - Creates server Supabase client via `createServerClient()`
   - Calls `supabase.auth.getUser()` to get auth user
   - Returns null if no auth user found
2. **Line 164-169:** If user is null, return 401 error
3. **Line 175:** If user exists, get team context with `getTeamContext(user.user_id)`
4. **Line 216:** Create Supabase client for database operations

---

## 6. RLS Policies

**Primary file:** [supabase/migrations/20251222003_update_rls_policies.sql](supabase/migrations/20251222003_update_rls_policies.sql)

**Helper functions file:** [supabase/migrations/20251222001_rls_helper_functions.sql](supabase/migrations/20251222001_rls_helper_functions.sql)

### INSERT Policy on `candidates` Table:

**Location:** Lines 8-24 in `20251222003_update_rls_policies.sql`

```sql
DROP POLICY IF EXISTS candidates_own_team ON candidates;
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

### RLS Helper Functions Used:

From [supabase/migrations/20251222001_rls_helper_functions.sql](supabase/migrations/20251222001_rls_helper_functions.sql):

1. **`is_master_admin(user_id UUID)` - Line 4-6:**
   ```sql
   CREATE OR REPLACE FUNCTION is_master_admin(user_id UUID) RETURNS BOOLEAN AS $$
     SELECT COALESCE((SELECT is_master_admin FROM users WHERE id = user_id::TEXT), false)
   $$ LANGUAGE sql STABLE SECURITY DEFINER;
   ```

2. **`get_user_team_id(user_id UUID)` - Line 9-11:**
   ```sql
   CREATE OR REPLACE FUNCTION get_user_team_id(user_id UUID) RETURNS UUID AS $$
     SELECT team_id FROM users WHERE id = user_id::TEXT
   $$ LANGUAGE sql STABLE SECURITY DEFINER;
   ```

3. **`is_membership_approved(user_id UUID, team_id UUID)` - Line 14-21:**
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

### Policy Requirements for INSERT:
The INSERT policy on `candidates` requires BOTH conditions to pass:
1. **User is master admin** (`is_master_admin(auth.uid())` returns true), OR
2. **User's team matches AND membership is approved:**
   - `team_id = get_user_team_id(auth.uid())` (candidate team_id matches user's team_id from users table)
   - `is_membership_approved(auth.uid(), team_id)` (user has 'approved' status in team_memberships table)

### Root Cause Analysis:
The persistent "User authentication required" error (401) occurs when `getCurrentUser()` returns null, which happens if:
- `supabase.auth.getUser()` returns null (no auth session)
- OR user record doesn't exist in the `users` table (line 73 in auth-server.ts checks if userData exists)

The RLS policy is a secondary concern - it would only fail after successful authentication with a different error (403 Forbidden).

---

## Summary Table

| Component | Status | Key Finding |
|-----------|--------|------------|
| **Error Source** | `POST /api/candidates:167` | `getCurrentUser()` returns null → 401 error |
| **Auth Retrieval** | `supabase.auth.getUser()` | Uses Supabase Auth session via cookies |
| **Middleware** | Email verification redirect | Checks `email_confirmed_at`, redirects non-OAuth users to verify |
| **Server Client** | Cookie-based SSR | Uses `cookies()` from next/headers, proper getAll/setAll |
| **Client Client** | Singleton pattern | Single browser client instance per app session |
| **Team Context** | Team isolation | Requires valid team_id from getTeamContext() |
| **RLS Policy** | Membership enforced | Requires 'approved' status in team_memberships table |
| **Email Check** | Middleware + Client | Enforced in middleware (line 55), client-side form check (line 57) |

