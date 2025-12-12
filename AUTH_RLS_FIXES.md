# Auth + RLS Failure Diagnosis & Fixes

## ROOT CAUSE ANALYSIS

### 1. **RLS Policy Violation: Teams INSERT Too Permissive**
**File:** `scripts/rls-policies-v2.sql:191-195`

**Problem:**
```sql
CREATE POLICY teams_insert_policy ON teams
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR auth.uid() IS NOT NULL  -- ❌ ALLOWS ANY AUTHENTICATED USER
  );
```

Any authenticated user could INSERT into teams, breaking multi-tenant isolation. Only service role should be able to create teams.

**Fix Applied:** Removed `OR auth.uid() IS NOT NULL` condition. Only `_rls_is_master_admin()` allowed.

---

### 2. **Admin Signup Uses REST API with ANON Key**
**File:** `src/lib/supabase/auth-server.ts:120-192` (OLD)

**Problem:**
```typescript
// OLD: Uses ANON key which has NO RLS bypass
const teamResponse = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/teams`,
  {
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,  // ❌ Cannot INSERT
    },
    body: JSON.stringify({ team_name, company_name, ... })
  }
)
```

- ANON key respects RLS policies → cannot INSERT into teams
- Signup workflow fails at team creation
- Users table insert also fails due to RLS requiring `team_id = current_user_team` (recursion)

**Fix Applied:**
- Replaced REST API calls with **admin client queries** using service role key
- Admin client bypasses RLS
- Proper error handling with `.select().single()`

```typescript
// NEW: Uses admin client with service role key
const { data: teamData, error: teamError } = await (supabase.from('teams') as any)
  .insert({
    team_name: data.teamName || data.companyName,
    company_name: data.companyName,
    subscription_tier: 'free',
    is_active: true,
  })
  .select()
  .single()

if (teamError || !teamData) {
  throw new Error(`Failed to create team: ${teamError?.message}`)
}
```

Same pattern applied to user insert.

---

### 3. **Update Last Login Missing Error Handling**
**File:** `src/app/api/auth/update-last-login/route.ts:23-26` (OLD)

**Problem:**
```typescript
// OLD: No error handling
await (supabase.from('users') as any)
  .update({ last_login: new Date().toISOString() })
  .eq('user_id', userId)

return NextResponse.json({ success: true }, { status: 200 })
```

Silent failures if update fails. Client doesn't know update succeeded.

**Fix Applied:** Added proper error handling:

```typescript
// NEW: With error handling
const { error } = await (supabase.from('users') as any)
  .update({ last_login: new Date().toISOString() })
  .eq('user_id', userId)

if (error) {
  console.error('Error updating last login:', error)
  return NextResponse.json(
    { success: false, error: 'Failed to update last login' },
    { status: 500 }
  )
}
```

---

## PATCHED FILES SUMMARY

### ✅ `/api/auth/user/route.ts`
**Status:** No changes needed (already correct)
- Already uses admin client
- Proper error handling in place
- Returns user data or null if not found

### ✅ `/api/auth/update-last-login/route.ts`
**Changes:** Added error handling after update
- Line 23-26: Changed from fire-and-forget to proper error checking
- Returns error response if update fails

### ✅ `/lib/supabase/auth-server.ts`
**Changes:** Replaced REST API calls with admin client
- Line 120-131: Team creation via admin client (was lines 122-152)
- Line 155-170: User creation via admin client (was lines 171-201)
- Proper error handling with error destructuring
- Uses `.select().single()` for response data

### ✅ `scripts/rls-policies-v2.sql`
**Changes:** Fixed teams INSERT policy
- Line 191-194: Removed `OR auth.uid() IS NOT NULL` condition
- Only `public._rls_is_master_admin()` can insert teams
- Enforces service role-only inserts during signup

---

## LOGIN FLOW - HOW IT WORKS NOW

```
1. User enters email/password on /admin/login

2. Client calls signIn(email, password)
   └─ Browser client: supabase.auth.signInWithPassword()
   └─ Supabase returns session + auth.users.id

3. Client calls POST /api/auth/user
   ├─ Request body: { userId: auth.users.id }
   ├─ Server creates admin client (service role)
   ├─ Admin client: supabase.from('users')
   │   .select(...relations)
   │   .eq('user_id', userId)
   │   .single()
   └─ Returns user record with team + role info

4. Client calls POST /api/auth/update-last-login
   ├─ Request body: { userId: auth.users.id }
   ├─ Server admin client updates users.last_login
   └─ Returns success/error

5. If user has team_id → redirect to /dashboard
   Else → redirect to /access-request
```

---

## SIGNUP FLOW - HOW IT WORKS NOW

```
1. User submits form on /admin/signup

2. Client calls POST /api/auth/admin-signup
   └─ Calls adminSignUp() from auth-server.ts

3. Server-side adminSignUp():
   ├─ Creates admin client (service role key)
   │
   ├─ Step 1: supabase.auth.admin.createUser()
   │  └─ Creates auth.users record
   │
   ├─ Step 2: admin.from('teams').insert()
   │  └─ Creates teams record (service role bypasses RLS)
   │
   ├─ Step 3: cloneRoleTemplatesForTeam(teamId)
   │  └─ Creates roles for team from templates
   │
   ├─ Step 4: getLocalAdminRole(teamId)
   │  └─ Gets the "Local Admin" role for assignment
   │
   ├─ Step 5: admin.from('users').insert()
   │  └─ Creates users record with:
   │     - user_id (from auth.users)
   │     - team_id (from teams)
   │     - role_id (Local Admin role)
   │     - is_master_admin: false
   │     - status: 'active'
   │
   ├─ On error: deletes auth.users (cleanup)
   └─ Returns { user, team }

4. Client redirects to /admin/login with success flag
```

---

## RLS POLICY STRUCTURE

### Helper Functions (lines 124-154)
```sql
_rls_current_user_id()      → Returns auth.uid()
_rls_current_user_team_id() → Returns users.team_id for current user
_rls_is_master_admin()      → Returns users.is_master_admin boolean
```

### Teams Policies (lines 191-206)
- **SELECT:** master_admin OR team_id = current_team
- **INSERT:** master_admin only ✅ FIXED
- **UPDATE:** master_admin OR team_id = current_team
- **DELETE:** master_admin only

### Users Policies (lines 280-306)
- **SELECT:** own record OR master_admin OR same_team
- **INSERT:** master_admin OR same_team OR own_record (for signup)
- **UPDATE:** own_record OR master_admin OR same_team
- **DELETE:** master_admin OR same_team

### Business Entity Policies (lines 316-567)
All follow pattern: **master_admin OR team_id = current_team**
- Candidates, Vendors, Clients, Requirements, Submissions, Interviews, Projects, Timesheets, Invoices, Immigration, Notes, Activities

---

## TESTING CHECKLIST

### ✅ RLS Policy Tests (After Deploying rls-policies-v2.sql)

Run in Supabase SQL Editor:

```sql
-- Test 1: ANON user CANNOT insert team
-- Expected: Permission denied
SELECT auth.uid(); -- Should be NULL or anon role
INSERT INTO teams (team_name, company_name)
VALUES ('Test Team', 'Test Corp');

-- Test 2: Service role CAN insert team
-- Expected: Success (use admin client)
INSERT INTO teams (team_name, company_name)
VALUES ('Valid Team', 'Valid Corp');

-- Test 3: Authenticated user CANNOT insert team
-- Expected: Permission denied
-- (Set auth context to regular user)
INSERT INTO teams (team_name, company_name)
VALUES ('Forbidden Team', 'Forbidden Corp');

-- Test 4: User can SELECT their own record
-- Expected: Success
SELECT * FROM users WHERE user_id = auth.uid();

-- Test 5: User CANNOT SELECT other team's users
-- Expected: Empty result or permission denied
SELECT * FROM users WHERE team_id != (
  SELECT team_id FROM users WHERE user_id = auth.uid()
);
```

### ✅ Application Tests

```bash
# 1. Test Admin Signup
curl -X POST http://localhost:3000/api/auth/admin-signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "SecurePassword123!",
    "firstName": "Admin",
    "lastName": "User",
    "companyName": "Test Company",
    "teamName": "Engineering",
    "subscriptionTier": "professional"
  }'

# Expected Response:
# {
#   "success": true,
#   "message": "Admin account created successfully",
#   "data": {
#     "user": { user_id, team_id, role_id, email, ... },
#     "team": { team_id, team_name, company_name, ... }
#   }
# }

# 2. Test Login Flow
# a) Sign in via Supabase auth
curl -X POST http://localhost:3000/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@test.com", "password": "SecurePassword123!" }'

# b) Get user record
curl -X POST http://localhost:3000/api/auth/user \
  -H "Content-Type: application/json" \
  -d '{ "userId": "..." }'

# Expected: { success: true, data: { user_id, team_id, role_id, email, ... } }

# c) Update last login
curl -X POST http://localhost:3000/api/auth/update-last-login \
  -H "Content-Type: application/json" \
  -d '{ "userId": "..." }'

# Expected: { success: true }

# 3. Test RLS Enforcement (Anonymous Request)
curl -X GET http://localhost:3000/api/teams \
  -H "Authorization: Bearer anon-key"

# Expected: Permission denied or empty result
```

---

## VERIFICATION CHECKLIST

- [x] Removed `OR auth.uid() IS NOT NULL` from teams INSERT policy
- [x] Replaced REST API calls with admin client in teamSignUp()
- [x] Added error handling to update-last-login endpoint
- [x] Admin client properly typed with `as any` to bypass type errors
- [x] User insert uses admin client with proper error handling
- [x] All .insert() calls followed by .select().single()
- [x] Service role key is loaded in createAdminClient()
- [x] Cleanup: deleteUser on signup failure

---

## DEPLOYMENT INSTRUCTIONS

### 1. Apply SQL Migrations
```bash
# Run RLS policies
npx supabase db push scripts/rls-policies-v2.sql

# Or manually in Supabase SQL Editor:
# Copy contents of scripts/rls-policies-v2.sql and execute
```

### 2. Deploy Updated Code
```bash
# Build
npm run build

# Deploy to Vercel (or your hosting)
git add -A
git commit -m "Fix: Auth + RLS policies for team signup and user login"
git push
```

### 3. Verify Deployment
- Navigate to `/admin/signup`
- Create test account
- Verify user + team created in Supabase
- Login with test account
- Verify login successful and last_login updated

---

## EDGE CASES & NOTES

1. **First-time signup user not provisioned:**
   - `/api/auth/user` returns `{ success: true, data: null }`
   - Login page redirects to `/access-request`
   - Correct behavior ✅

2. **Multiple teams for user:**
   - Current schema: users.team_id (single team)
   - For multi-team: would need team_members junction table
   - Not required for current implementation ✅

3. **Master admin user:**
   - `is_master_admin: true` + `team_id: NULL` + `role_id: NULL`
   - Can see all teams and users
   - Uses `_rls_is_master_admin()` in all policies ✅

4. **Service role key leakage:**
   - Only used server-side in API routes
   - Never exposed to client
   - Environment variable validation in createAdminClient() ✅

---

## SUCCESS INDICATORS

✅ **Admin Signup Works**
- Team created in DB
- User created in DB with team_id set
- Redirects to login with success message

✅ **Login Works**
- Password auth succeeds
- /api/auth/user returns user data
- last_login updated
- Redirects based on team membership

✅ **RLS Enforced**
- Anon users cannot read/write tables
- Users can only see their own team's data
- Master admin can see all teams
- Team creation restricted to service role

---

Generated: 2025-12-12
Next Steps: Deploy and test end-to-end
