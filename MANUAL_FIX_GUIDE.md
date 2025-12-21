# MANUAL FIX GUIDE - Production Critical Issues

**Last Updated**: 2025-12-22
**For**: Perelman ATS Supabase Database

---

## CRITICAL ISSUES SUMMARY

1. ❌ RLS policies block service role - prevents admin operations
2. ❌ Signup doesn't create user records - users can't use the app
3. ❌ API code uses wrong column names - data insertion fails
4. ❌ No team assignment flow - users have NULL team_id
5. ❌ Unclear role assignment - users have NULL role_id

---

## FIX 1: Grant Service Role Permissions (CRITICAL)

**Symptom**: "permission denied for table teams" errors in server code

**Root Cause**: RLS enabled, but service_role not granted permissions

**To Fix**:

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project
2. Click **SQL Editor** in left sidebar
3. Copy and paste this SQL:

```sql
-- ============================================================================
-- FIX: Grant service_role permissions to bypass RLS for admin operations
-- ============================================================================

-- Grant SELECT, INSERT, UPDATE, DELETE on all tables to service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_requirements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timesheets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.immigration TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_permissions TO service_role;

-- Grant function execution to service_role
GRANT EXECUTE ON FUNCTION public._rls_current_user_id() TO service_role;
GRANT EXECUTE ON FUNCTION public._rls_current_user_team_id() TO service_role;
GRANT EXECUTE ON FUNCTION public._rls_is_master_admin() TO service_role;

-- Verify: Run this to confirm
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

4. Click **Run**
5. You should see "Success" with output showing all tables with `rowsecurity = true`

**Verify It Worked**:
```
Expected output shows:
- users | t
- teams | t
- candidates | t
... (all tables with rowsecurity = true)
```

---

## FIX 2: Fix Column Name Mismatches in API Code

**Symptom**: "Unknown column" or "permission denied" on data insertion

**Root Cause**: API code uses different column names than actual schema

**Schema Reality** (from `src/types/database.ts`):
- candidates table has `id` (not `candidate_id`)
- candidates table has `location` (not `current_location`)
- candidates table has `current_employer` (not `current_company`)
- candidates table does NOT have `preferred_locations`, `linkedin_url`, `resume_url`, `available_from`

**To Fix**:

File: `src/app/api/candidates/route.ts` (lines 237-261)

**Current (WRONG)**:
```typescript
const { data: candidate, error } = await (supabase
  .from('candidates') as any)
  .insert({
    team_id: teamContext.teamId,
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email || null,
    phone: data.phone || null,
    status: data.status,
    current_location: data.currentLocation || null,  // ❌ WRONG
    preferred_locations: data.preferredLocations,      // ❌ DOESN'T EXIST
    work_authorization: data.workAuthorization || null, // ❌ DOESN'T EXIST
    linkedin_url: data.linkedinUrl || null,            // ❌ DOESN'T EXIST
    resume_url: data.resumeUrl || null,                // ❌ DOESN'T EXIST
    skills: data.skills,
    experience_years: data.experienceYears || null,
    current_title: data.currentTitle || null,
    current_company: data.currentCompany || null,     // ❌ WRONG (should be current_employer)
    desired_salary: data.desiredSalary || null,       // ❌ DOESN'T EXIST
    available_from: data.availableFrom || null,       // ❌ DOESN'T EXIST
    notes: data.notes || null,                         // ❌ DOESN'T EXIST
    created_by: user.user_id,
  })
  .select()
  .single()
```

**Fixed (CORRECT)**:
```typescript
const { data: candidate, error } = await (supabase
  .from('candidates') as any)
  .insert({
    team_id: teamContext.teamId,
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email || null,
    phone: data.phone || null,
    status: data.status || 'new',
    location: data.currentLocation || null,        // ✅ CORRECT
    // Remove: preferred_locations
    // Remove: work_authorization
    // Remove: linkedin_url
    // Remove: resume_url
    skills: data.skills || null,
    experience_years: data.experienceYears || null,
    current_title: data.currentTitle || null,
    current_employer: data.currentCompany || null, // ✅ CORRECT NAME
    // Remove: desired_salary
    // Remove: available_from
    // Remove: notes
    created_by: user.user_id,
  })
  .select()
  .single()
```

Apply this fix:

```bash
# Edit the file:
code src/app/api/candidates/route.ts

# Around line 239-259, replace the insert object
```

---

## FIX 3: Implement User Signup → Team Assignment

**Symptom**: After signup, user has `team_id: null` and cannot create records

**Root Cause**: No flow to assign users to teams on signup

**To Fix**:

**Option A: Auto-Create Team on Signup** (Recommended)

File: `src/lib/auth-actions.ts`

Update the `signUp` function (lines 27-54) to also create a team:

```typescript
export async function signUp(email: string, password: string) {
  const supabase = await createClient();

  // Step 1: Create auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: 'Failed to create user' };
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminSupabase = await createAdminClient();

    // Generate UUIDs for team and role
    const teamId = crypto.randomUUID();
    const roleId = crypto.randomUUID();

    // Step 2: Create team
    const { error: teamError } = await (adminSupabase.from('teams') as any)
      .insert({
        id: teamId,
        name: `${email.split('@')[0]}'s Team`,
      });

    if (teamError) {
      console.error('Failed to create team:', teamError);
      throw new Error('Could not create team');
    }

    // Step 3: Create admin role for the team
    const { error: roleError } = await (adminSupabase.from('roles') as any)
      .insert({
        id: roleId,
        team_id: teamId,
        name: 'Admin',
        is_admin: true,
      });

    if (roleError) {
      console.error('Failed to create admin role:', roleError);
      throw new Error('Could not create admin role');
    }

    // Step 4: Create user record and assign to team
    const { error: userError } = await (adminSupabase.from('users') as any)
      .insert({
        id: data.user.id,
        email: email.trim().toLowerCase(),
        is_master_admin: false,
        team_id: teamId,        // ✅ Assign team
        role_id: roleId,        // ✅ Assign admin role
      });

    if (userError) {
      console.error('Failed to create user record:', userError);
      throw new Error('Could not create user record');
    }

    return { success: true, data };
  } catch (err) {
    console.error('Signup failed:', err);
    return { error: err.message || 'Signup failed. Please try again.' };
  }
}
```

Also update `signIn` the same way (lines 61-121).

---

## FIX 4: Update Frontend Form to Match Schema

**File**: `src/app/(app)/candidates/new/page.tsx`

Remove these fields from the form (they don't exist in schema):
- preferredLocations
- workAuthorization
- linkedinUrl
- resumeUrl
- desiredSalary
- availableFrom
- notes

Keep only these fields:
- firstName
- lastName
- email
- phone
- currentLocation (maps to `location`)
- currentTitle
- currentCompany (maps to `current_employer`)
- experienceYears
- skills
- status

---

## FIX 5: Add Error Handling for Missing Team

**File**: `src/lib/utils/team-context.ts`

Line 176-177 already has this, but make sure error message is helpful:

```typescript
if (!teamContext.teamId) {
  return { error: 'Cannot create candidate: User not assigned to a team. Please contact your administrator.' };
}
```

---

## TESTING AFTER FIXES

### Test 1: Verify Service Role Works
```bash
# In Supabase SQL Editor, run:
SELECT COUNT(*) FROM teams;
-- Should return: 1 row with count >= 0 (no error)
```

### Test 2: Create a Test User
1. Sign up a new user: `testuser@example.com` / `Password123!`
2. In SQL Editor, verify:
```sql
SELECT id, email, team_id, role_id, is_master_admin FROM users
WHERE email = 'testuser@example.com';

-- Expected output:
-- id: (UUID from auth)
-- email: testuser@example.com
-- team_id: (NOT NULL)
-- role_id: (NOT NULL)
-- is_master_admin: false
```

### Test 3: Create a Candidate
1. Log in as testuser@example.com
2. Click "Candidates" → "New Candidate"
3. Fill in: First Name, Last Name, Email, Status
4. Click "Create Candidate"
5. Should succeed (no error)
6. Verify in SQL:
```sql
SELECT id, team_id, first_name, last_name, email FROM candidates
WHERE created_by = (SELECT id FROM users WHERE email = 'testuser@example.com')
LIMIT 1;

-- Expected output: 1 row with the candidate data
```

### Test 4: Verify Multi-Tenant Isolation
1. Create TWO test users in different teams
2. Log in as User A
3. Create a candidate
4. Log in as User B
5. Try to view candidates - should see NONE (only User A's team's data)

```sql
-- Verify isolation:
SELECT
  (SELECT COUNT(*) FROM candidates WHERE team_id = 'TEAM_A_ID') as team_a_count,
  (SELECT COUNT(*) FROM candidates WHERE team_id = 'TEAM_B_ID') as team_b_count;
```

---

## SUMMARY OF CHANGES

| Issue | File | Change | Priority |
|-------|------|--------|----------|
| Service role blocked | DB (SQL) | ADD GRANT statements | 🔴 CRITICAL |
| Wrong column names | `src/app/api/candidates/route.ts` | Fix insert columns | 🔴 CRITICAL |
| No team assignment | `src/lib/auth-actions.ts` | Create team on signup | 🔴 CRITICAL |
| Form schema mismatch | `src/app/(app)/candidates/new/page.tsx` | Remove extra fields | 🟡 HIGH |

---

## ROLLBACK PLAN

If something breaks:

```sql
-- Revert service role grants:
REVOKE ALL ON public.users FROM service_role;
REVOKE ALL ON public.teams FROM service_role;
-- ... etc for all tables
```

But you shouldn't need to - these are only adding permissions, not removing anything.

---

## QUESTIONS?

If you encounter errors:

1. **"permission denied for table"** → Did you run FIX 1 (service role grants)?
2. **"Unknown column"** → Did you run FIX 2 (fix column names)?
3. **"User not assigned to team"** → Did you run FIX 3 (signup flow)?
4. **Form won't submit** → Did you run FIX 4 (update form fields)?

Check that all 4 fixes are applied before testing.

