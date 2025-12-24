# RLS Infinite Recursion Issue - Quick Summary

## Problem Statement

Error: **"infinite recursion detected in policy for relation users"**

This error occurs when `getTeamContext()` tries to query the `public.users` table in Supabase project `awujhuncfghjshggkqyo`.

---

## Root Cause

The `users_own_team` RLS policy calls the `is_admin_for_team()` helper function, which internally queries the same `users` table. This creates infinite recursion:

```
Query → RLS Policy → is_admin_for_team() → Query on users → RLS Policy → ... (infinite)
```

---

## Affected Files

### Migration Files
1. **`/d/Perelman-ATS-claude/supabase/migrations/20251222001_rls_helper_functions.sql`**
   - Contains: `is_master_admin()`, `get_user_team_id()`, `is_membership_approved()`, `is_admin_for_team()`
   - Problem: Missing `SET row_security = off` clause

2. **`/d/Perelman-ATS-claude/supabase/migrations/20251222003_update_rls_policies.sql`**
   - Contains updated RLS policies
   - Problem: Calls `is_admin_for_team()` which has infinite recursion issue

3. **`/d/Perelman-ATS-claude/scripts/03-jwt-triggers.sql`**
   - Contains duplicate `is_admin_for_team()` function
   - Problem: Also missing `SET row_security = off` clause

### Application Code
- **`/d/Perelman-ATS-claude/src/lib/utils/team-context.ts`**
  - Function: `getTeamContext(userId)` - triggers the issue
  - Queries the `users` table which evaluates RLS policies

---

## Solution

Add `SET row_security = off` to all helper functions that query the `users` table.

### Example Fix

**Before (Problematic):**
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

**After (Fixed):**
```sql
CREATE OR REPLACE FUNCTION is_admin_for_team(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = user_id::TEXT
      AND r.is_admin = true
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET row_security = off;
                                        ^^^^^^^^^^^^^^^^^^^^
```

---

## How to Apply the Fix

### Option 1: Use the Provided SQL Script (Recommended)
```bash
# In Supabase SQL Editor or psql:
# Copy contents of FIX_RLS_RECURSION.sql and run
```

### Option 2: Manual Steps
1. Open Supabase SQL Editor
2. Run the following for each helper function:
   - `is_master_admin()`
   - `get_user_team_id()`
   - `is_membership_approved()`
   - `is_admin_for_team()` (both UUID and TEXT versions if present)
3. Add `SET row_security = off` before the semicolon
4. Re-grant execute permissions

### Option 3: Update Migration Files
1. Edit `/d/Perelman-ATS-claude/supabase/migrations/20251222001_rls_helper_functions.sql`
2. Add `SET row_security = off` to all four functions
3. Run migration in Supabase

---

## Why This Works

```
SET row_security = off      Allows function to bypass RLS
SECURITY DEFINER            Runs with postgres privileges (trusted)
────────────────────────────────────────────────────────────────
Result:                     Internal queries don't trigger RLS recursion
```

**Security Implications:**
- RLS is still enforced for direct application queries
- Helper functions bypass RLS only during their internal processing
- No security vulnerability (postgres is the owner)
- Standard PostgreSQL best practice

---

## Testing After Fix

Run these queries as an authenticated user in Supabase SQL Editor:

```sql
-- Test 1: Call helper functions directly
SELECT is_master_admin(auth.uid()::UUID);
SELECT get_user_team_id(auth.uid()::UUID);
SELECT is_admin_for_team(auth.uid()::UUID);

-- Test 2: Query users table (should work without recursion error)
SELECT id, email, team_id, is_master_admin FROM users LIMIT 5;

-- Test 3: Test getTeamContext equivalent query
SELECT
  id,
  team_id,
  role_id,
  is_master_admin
FROM users
WHERE id = auth.uid()::TEXT;
```

All queries should complete successfully without "infinite recursion" error.

---

## RLS Policies on public.users

Three policies are defined:

1. **`users_master_admin`**
   - Allows: Master admins see all users
   - Uses: `is_master_admin(auth.user_id())`

2. **`users_own_team`** (PROBLEMATIC)
   - Allows: Users see their own team members (if approved and user is admin)
   - Uses: `is_admin_for_team()` ← This causes the recursion

3. **`users_own_profile`**
   - Allows: Users see their own profile
   - Uses: Direct `id` comparison, no recursion

---

## Key Files Created for Reference

1. **`RLS_INFINITE_RECURSION_ANALYSIS.md`**
   - Detailed technical analysis
   - Complete explanation of the issue

2. **`RLS_RECURSION_DIAGRAM.txt`**
   - Visual flow diagram of the recursion
   - Shows before/after scenarios

3. **`FIX_RLS_RECURSION.sql`**
   - Ready-to-apply SQL fix script
   - Includes verification steps

---

## Next Steps

1. Review the analysis documents
2. Apply the SQL fix using provided script or manually
3. Test the queries in Supabase SQL Editor
4. Verify `getTeamContext()` works in your application
5. Monitor for any RLS policy issues

---

## Questions?

The recursion happens because:
- RLS policies must be evaluated for every query
- Helper functions called from policies are themselves queries
- If those helper functions query the same table, RLS evaluates again
- This creates a circular dependency

The solution works because:
- `SET row_security = off` tells PostgreSQL to skip RLS evaluation in the function
- The function still runs with secure postgres privileges
- Direct user queries still have RLS enforcement
- No security vulnerability occurs
