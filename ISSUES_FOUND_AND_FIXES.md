# CRITICAL ISSUES FOUND & FIXES REQUIRED

**Date**: 2025-12-22
**Status**: Production Critical
**Severity**: 🔴 CRITICAL - Users cannot create records after login

---

## SUMMARY

The application has fundamental architecture and RLS configuration issues that prevent users from creating records. After login, users encounter "User authentication required" or permission errors when trying to insert data.

---

## ROOT CAUSES IDENTIFIED

### 1. 🔴 RLS Misconfiguration - Service Role Access Missing

**Problem**:
- RLS is enabled on all tables
- Tables grant permissions ONLY to `authenticated` and `anon` roles
- **Missing**: Grant to `service_role` (the admin/server role)
- Result: Admin client operations fail with "permission denied"

**Evidence**:
```
Database test output:
❌ Error querying teams: permission denied for table teams
```

**File**: `supabase/migrations/20251221_fix_rls_complete.sql` (lines 166-212)

Missing statements:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;
-- ... and 15 more tables
```

**Impact**:
- Server-side operations (API routes, server actions) fail
- Admin operations cannot execute
- Data insertion fails silently or with "permission denied" error

---

### 2. 🟡 User Signup Flow - User Record Not Created

**Problem**:
- User signs up → auth user created ✅
- But NO user record created in `users` table ❌
- `signUp()` in `src/lib/auth-actions.ts` tries to create user record but silently ignores errors (line 45-48)

**File**: `src/lib/auth-actions.ts` (lines 27-54)

```typescript
// Note: users table uses id, not user_id; no username/status columns in actual schema
const { error: userError } = await (adminSupabase.from('users') as any)
  .insert({
    id: data.user.id,
    email: email.trim().toLowerCase(),
    is_master_admin: false,
    team_id: null,  // ← User starts with NULL team_id
    role_id: null,  // ← User starts with NULL role_id
  });

if (userError) {
  console.error('Failed to create user record:', userError);
  // Don't fail signup - user can still log in and create record later ← WRONG!
}
```

**Why This Fails**:
- Admin client cannot insert (RLS blocks it - bug #1)
- Error is silently swallowed
- User exists in auth but NOT in database
- Later operations fail when trying to query user's team/role

**Impact**:
- New users have broken records
- `getTeamContext()` throws "User not found or not authenticated"
- API routes return 500 errors
- Signup appears to work but user cannot use the app

---

### 3. 🟡 Missing Team Assignment Flow

**Problem**:
- After signup, user has `team_id: null` and `role_id: null`
- No clear flow for how users get assigned to teams
- Manual admin work required? Self-service? Unclear.

**Where It Should Happen**:
- Option A: Auto-create team on first signup
- Option B: Invite flow where admin adds users to team
- Option C: Self-service team join flow

**Currently**: Not implemented. Users are "orphaned" in database.

**Impact**:
- `getTeamContext()` fails with "User does not belong to any team"
- All data operations fail because `teamId` is null

---

### 4. 🟡 RLS Policy Issues - Overly Restrictive

**File**: `supabase/migrations/20251221_fix_rls_complete.sql` (lines 103-437)

**Problems**:

a) **policies reference `is_admin` column but schema uses different name**
   - Migration: `is_admin` (line 150)
   - Actual schema check: need to verify column name

b) **Policies use `auth.uid()` which is NULL for service_role**
   - Line 224: `public._rls_is_master_admin()` calls `auth.uid()`
   - Service role has no auth context
   - Policies reject all service role operations

c) **Team isolation policies reference auth context**
   - Most policies rely on `public._rls_current_user_team_id()`
   - This function queries `users` table
   - If user record doesn't exist, returns NULL
   - RLS blocks all access

**Example - Users Table Policy** (lines 222-253):
```sql
CREATE POLICY users_master_admin_all ON users
  FOR ALL
  USING (public._rls_is_master_admin())  -- Fails if auth.uid() is NULL
  WITH CHECK (public._rls_is_master_admin());

CREATE POLICY users_read_self ON users
  FOR SELECT
  USING (id = public._rls_current_user_id());  -- Works for auth users

CREATE POLICY users_read_team ON users
  FOR SELECT
  USING (
    team_id = public._rls_current_user_team_id()
    AND team_id IS NOT NULL
  );  -- Requires user to already have team_id
```

**Impact**:
- Service role cannot operate on any tables
- Auth users cannot query before being assigned a team
- Bootstrap/onboarding operations fail

---

### 5. 🟡 Database Schema Mismatch with API Code

**Problem**: Code references columns that may not match actual schema

**Examples**:

In `src/app/api/candidates/route.ts` (line 240):
```typescript
.insert({
  team_id: teamContext.teamId,
  first_name: data.firstName,
  last_name: data.lastName,
  email: data.email || null,
  phone: data.phone || null,
  status: data.status,
  current_location: data.currentLocation || null,
  preferred_locations: data.preferredLocations,
  work_authorization: data.workAuthorization || null,
  linkedin_url: data.linkedinUrl || null,
  resume_url: data.resumeUrl || null,
  skills: data.skills,
  experience_years: data.experienceYears || null,
  current_title: data.currentTitle || null,
  current_company: data.currentCompany || null,
  desired_salary: data.desiredSalary || null,
  available_from: data.availableFrom || null,
  notes: data.notes || null,
  created_by: user.user_id,
})
```

**Issue**: Don't know actual `candidates` schema from migrations. Needs verification.

---

## REQUIRED FIXES (IN ORDER)

### FIX 1: Add Service Role Grants to RLS Policies
**Priority**: 🔴 CRITICAL
**File to Create**: `supabase/migrations/20251222_fix_rls_service_role.sql`

```sql
-- Grant all table permissions to service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO service_role;
-- ... (repeat for all 16 tables)

-- Grant function execution to service_role
GRANT EXECUTE ON FUNCTION public._rls_current_user_id() TO service_role;
GRANT EXECUTE ON FUNCTION public._rls_current_user_team_id() TO service_role;
GRANT EXECUTE ON FUNCTION public._rls_is_master_admin() TO service_role;
```

**How to Apply**:
1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL from `supabase/migrations/20251222_fix_rls_service_role.sql`
3. Verify: Try to query `teams` table with admin client

**Tests After**:
```javascript
// Should work after fix
const { data } = await adminClient
  .from('teams')
  .select('*')
  .limit(1);
// Should return teams, not "permission denied"
```

---

### FIX 2: Implement User Signup → Team Assignment Flow
**Priority**: 🔴 CRITICAL
**Files to Update**:
- `src/lib/auth-actions.ts` - signup/signin
- `src/lib/supabase/auth-server.ts` - getCurrentUser
- New: `src/app/api/auth/onboard/route.ts` - onboarding flow

**Options**:

**Option A: Auto-Create Team on First Signup** (Recommended for now)
```typescript
// In signUp() and signIn()
if (!existingUser) {
  // Create user record
  const { data: user } = await adminSupabase.from('users').insert({...}).select().single();

  // Create default team
  const { data: team } = await adminSupabase.from('teams').insert({
    id: uuidv4(),
    name: `${email}'s Team`,
  }).select().single();

  // Assign user to team + create admin role
  await adminSupabase.from('users').update({
    team_id: team.id,
    role_id: adminRoleId, // Default role for team creator
  }).eq('id', user.id);
}
```

**Option B: Invite Flow** (More complex, defer for now)
- Only admin can invite users
- Users join existing team
- Requires team to already exist

**Option C: Self-Service Join** (Most complex, defer)
- Users create team during signup
- Users can join via code/link

---

### FIX 3: Verify and Audit All RLS Policies
**Priority**: 🟡 HIGH
**Files to Check**:
- `supabase/migrations/20251221_fix_rls_complete.sql`
- `supabase/migrations/20251221_cleanup_policies.sql`

**Steps**:
1. Verify all table schemas match policy column names
2. Ensure policies have proper NULL checks
3. Add BYPASSRLS role if needed for service operations
4. Test each policy with actual user contexts

**Common Issues to Look For**:
- Column name mismatches (`is_admin` vs `is_admin_role`)
- Auth context assumptions (`auth.uid()` might be NULL for service role)
- Team isolation assumes `team_id IS NOT NULL`
- Permission checks assume user record exists

---

### FIX 4: Add Validation to API Routes
**Priority**: 🟡 HIGH
**Files to Update**:
- `src/app/api/candidates/route.ts` (and other entity routes)
- Add explicit error messages for common failures

```typescript
const teamContext = await getTeamContext(user.user_id);

if (!teamContext.teamId) {
  return NextResponse.json(
    {
      success: false,
      error: 'Your user account is not yet assigned to a team. Please contact your administrator.'
    },
    { status: 403 }
  );
}
```

---

### FIX 5: Update Signup Error Handling
**Priority**: 🟡 HIGH
**File**: `src/lib/auth-actions.ts`

**Current**:
```typescript
if (userError) {
  console.error('Failed to create user record:', userError);
  // Don't fail signup - user can still log in and create record later
}
```

**Fixed**:
```typescript
if (userError) {
  console.error('Failed to create user record:', userError);
  throw new Error(`Signup failed: Could not create user record. ${userError.message}`);
}
```

Don't silently fail - user needs to know signup is incomplete.

---

## TESTING STRATEGY

### Phase 1: Verify RLS Fix
```javascript
// After applying fix #1, test with admin client
const admin = createClient(url, serviceKey);
const { data, error } = await admin.from('teams').select('*').limit(1);
// Should work (not "permission denied")
```

### Phase 2: Test Signup Flow
```javascript
1. Sign up new user
2. Check users table directly:
   SELECT * FROM users WHERE email = 'newuser@example.com';
3. Verify user has:
   - id (from auth)
   - team_id (should NOT be null)
   - role_id (should NOT be null)
   - is_master_admin (false)
```

### Phase 3: Test Data Insertion
```javascript
1. Logged-in user creates candidate
2. Check candidates table:
   SELECT * FROM candidates WHERE team_id = 'user-team-id';
3. Verify record exists with:
   - team_id matches user's team
   - created_by is user's ID
   - All required fields present
```

### Phase 4: Test Multi-Tenant Isolation
```javascript
1. Create two teams with different users
2. User A creates candidate in team A
3. User B (team B) tries to query candidates:
   SELECT * FROM candidates;
4. Should return ONLY team B candidates (RLS filters)
```

---

## ARCHITECTURE DECISIONS

### Multi-Tenancy Model
- **Type**: Team-based SaaS (one database, multiple tenants)
- **Tenant Identifier**: `team_id` UUID
- **Isolation**: RLS policies at database level
- **Master Admin**: Single `is_master_admin` user who sees all teams

### User Lifecycle
```
1. signUp()
   → Create auth user
   → Create user record in DB
   → Auto-create team
   → Auto-create admin role
   → Assign user to team with admin role

2. signIn()
   → Auth user
   → Load user record with team + role
   → Check team_id and role_id are NOT NULL
   → Proceed to app

3. createCandidate()
   → Get user team_id from user record (server-side)
   → Insert with team_id = user's team (RLS enforces)
   → User only sees own team's candidates
```

### Admin Operations
- **Master Admin**: Can see/edit all teams
- **Local Admin** (Team Lead): Can see/edit own team
- **Regular User**: Can see/edit own team (per permissions)

---

## FILES TO CREATE/MODIFY

### Create New Files:
1. ✅ `supabase/migrations/20251222_fix_rls_service_role.sql` - RLS fix
2. ✅ `ISSUES_FOUND_AND_FIXES.md` - This file

### Modify Existing Files:
1. `src/lib/auth-actions.ts` - Fix signup/signin error handling
2. `src/app/api/candidates/route.ts` - Add validation
3. (Others as bugs are found)

---

## NEXT STEPS

1. **Apply RLS Fix** - Copy SQL to Supabase dashboard and execute
2. **Run Tests** - Verify admin client can access tables
3. **Implement Signup Flow** - Ensure user record created correctly
4. **Test End-to-End** - signup → createCandidate → verify in DB
5. **Document** - Update README with correct flow

---

## QUESTIONS NEEDING ANSWERS

1. **What's the actual candidates table schema?** (column names, types)
2. **Should new users auto-create teams or be invited to existing ones?**
3. **What's the default role for new users?**
4. **Are there any other tables missing from RLS grants?**
5. **Should we use BYPASSRLS for service operations or explicit grants?**

