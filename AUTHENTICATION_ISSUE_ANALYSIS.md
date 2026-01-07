# Authentication Issue Analysis & Fix

## Problem Statement
Users are seeing the error **"User authentication required. Please log in again"** when trying to create a candidate, even though they are properly logged in and authenticated.

## Root Cause Analysis

### The Bug
The issue is in the `is_membership_approved()` SQL function in the RLS (Row-Level Security) policies.

**File:** `supabase/migrations/20251222001_rls_helper_functions.sql`

**Broken Code:**
```sql
CREATE OR REPLACE FUNCTION is_membership_approved(user_id UUID, team_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_memberships
    WHERE team_memberships.user_id = user_id::TEXT
      AND team_memberships.team_id = $2          -- BUG: Using $2 (parameter 2)
      AND team_memberships.status = 'approved'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

The problem is on this line:
```sql
AND team_memberships.team_id = $2
```

### Why This Is Wrong
- The function has two parameters: `user_id` (position 1) and `team_id` (position 2)
- Using `$2` as a parameter reference works in prepared statements
- **However**, in SQL functions with named parameters, you should use the parameter name directly, not the positional reference
- Using `$2` causes the function to reference an undefined/incorrect parameter value
- This causes the function to return `FALSE` even when the user has approved membership

### How It Breaks the RLS Policies
The RLS policies for the candidates table (and 10+ other tables) use this function:

```sql
CREATE POLICY candidates_own_team ON candidates
  USING (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)  -- This returns FALSE due to the bug
    )
  )
```

When a user tries to access candidates:
1. `is_master_admin()` returns FALSE (they're not master admin)
2. `team_id = get_user_team_id()` might be TRUE (they're on the team)
3. **`is_membership_approved()` returns FALSE** (because of the `$2` bug)
4. The entire condition becomes FALSE
5. RLS denies access
6. Supabase returns a 401 error: "User authentication required"

### Tables Affected
All of these tables use the broken `is_membership_approved()` function in their RLS policies:
- candidates
- vendors
- clients
- job_requirements
- submissions
- interviews
- projects
- timesheets
- invoices
- immigration
- notes

## The Fix

### Step 1: Fix the Migration File
Changed `supabase/migrations/20251222001_rls_helper_functions.sql`:

**Before:**
```sql
AND team_memberships.team_id = $2
```

**After:**
```sql
AND team_memberships.team_id = team_id
```

### Step 2: Apply to Database
Created new migration: `supabase/migrations/20260107_fix_is_membership_approved_function.sql`

This migration:
1. Drops the broken function (CASCADE to remove dependent policies)
2. Recreates the function with the correct parameter reference
3. Re-grants permissions

**The Fixed Function:**
```sql
CREATE FUNCTION is_membership_approved(user_id UUID, team_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_memberships
    WHERE team_memberships.user_id = user_id::TEXT
      AND team_memberships.team_id = team_id    -- Correct: using named parameter
      AND team_memberships.status = 'approved'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

## How to Apply the Fix

### Option 1: Apply Migration via Supabase CLI
```bash
# Make sure you're in the project root
cd /d/Perelman-ATS-claude

# Push the migration to your Supabase project
npx supabase db push

# Or if using supabase-cli directly
supabase migration up
```

### Option 2: Manual SQL via Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL from `supabase/migrations/20260107_fix_is_membership_approved_function.sql`
3. Verify the function was recreated correctly

### Option 3: Using psql Directly
```bash
psql postgresql://[user]:[password]@[host]/[database] < supabase/migrations/20260107_fix_is_membership_approved_function.sql
```

## Verification Steps

After applying the fix, verify that the function works correctly:

```sql
-- Check the function definition
SELECT prosrc FROM pg_proc WHERE proname = 'is_membership_approved';

-- Test the function
-- Assuming you have a user and team_membership record
SELECT is_membership_approved(
  'user-id-here'::UUID,
  'team-id-here'::UUID
);

-- This should now return TRUE for users with approved membership
```

## Test the Application

1. **Log in** as a regular user (not master admin)
2. Navigate to **Candidates** page
3. Try to **Create a candidate**
4. Should now work without the "User authentication required" error

If still having issues:
- Verify the user has an approved membership in the team_memberships table
- Check that the user's team_id matches the team they're trying to access
- Verify the migration was applied (check `supabase_migrations` table)

## Additional Notes

### Why This Bug Existed
The code was likely adapted from a prepared statement context where `$2` is the standard way to reference the second parameter. However, in SQL functions with named parameters, you should use the parameter name directly.

### Why the Error Message is Confusing
When RLS denies access due to a policy evaluating to FALSE, Supabase returns a generic 401 "Unauthorized" error. This is intentional for security reasons - it doesn't reveal which policy failed or why.

### Prevention
For future RLS functions:
- Always use named parameters in SQL functions (e.g., `team_id` not `$2`)
- Test RLS policies with actual user queries before deploying
- Use parameterized functions that have `SECURITY DEFINER` to ensure proper permissions
- Add comprehensive test coverage for RLS policy changes

## Files Modified
1. `supabase/migrations/20251222001_rls_helper_functions.sql` - Fixed the function definition
2. `supabase/migrations/20260107_fix_is_membership_approved_function.sql` - New migration to apply fix

## Related Code Files
- `src/app/api/candidates/route.ts` - POST endpoint that creates candidates
- `src/lib/api/candidates.ts` - Client-side candidate functions
- `src/lib/utils/team-context.ts` - Team access validation
- `supabase/migrations/20251222003_update_rls_policies.sql` - RLS policies using the broken function
