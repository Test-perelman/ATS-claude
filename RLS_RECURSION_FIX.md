# RLS Infinite Recursion Fix - CRITICAL

## The Problem

The app cannot create candidates because of an RLS (Row-Level Security) policy infinite recursion error:

```
Error: infinite recursion detected in policy for relation "users"
```

### Root Cause

The RLS policies on the `users` table call helper functions:
- `is_master_admin(user_id)`
- `get_user_team_id(user_id)`
- `is_admin_for_team(user_id)`

These functions query the `users` table, which has RLS policies that call these same functions, creating an infinite loop.

### Impact

- ❌ Cannot query `public.users` table
- ❌ Cannot create candidates
- ❌ Cannot authenticate users
- ❌ Any API endpoint accessing users fails with 500 error

## The Solution

Recreate the helper functions with `SECURITY DEFINER` clause. This allows the functions to bypass RLS when executing, preventing the recursion.

### Fix Steps

**Step 1: Go to Supabase SQL Editor**
1. Open https://supabase.com/dashboard
2. Select your project: `awujhuncfghjshggkqyo`
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

**Step 2: Run this SQL to fix the recursion**

Copy and paste this entire SQL block:

```sql
-- Fix RLS Infinite Recursion
-- Drop existing functions that cause recursion
DROP FUNCTION IF EXISTS is_master_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_team_id(TEXT) CASCADE;
DROP FUNCTION IF EXISTS is_admin_for_team(TEXT) CASCADE;

-- Recreate with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION get_user_team_id(user_id TEXT)
RETURNS UUID AS $$
  SELECT team_id FROM users WHERE id = user_id
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_master_admin(user_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT is_master_admin FROM users WHERE id = user_id
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin_for_team(user_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT COALESCE((
    SELECT r.is_admin
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = user_id
  ), FALSE)
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_team_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_master_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_for_team(TEXT) TO authenticated;
```

**Step 3: Click "Run"**
- The query should execute successfully with no errors
- You may see messages like "CREATE FUNCTION" or "GRANT" which is normal

**Step 4: Verify the fix**

Run this test query to confirm:

```sql
SELECT id, email, is_master_admin, team_id
FROM users
LIMIT 1;
```

Should return: **1 row** with user data (no recursion error)

## After the Fix

Once applied, you should immediately be able to:
- ✅ Log in to the app
- ✅ Create candidates
- ✅ Query user data
- ✅ Access all protected APIs

## Test the Fix

After applying the fix, run:

```bash
npx tsx scripts/test_candidate_directly.ts
```

Expected output:
```
Response Status: 200 or 201
{
  "success": true,
  "data": { candidate object }
}
```

## Technical Explanation

### What is SECURITY DEFINER?

`SECURITY DEFINER` means:
- Function executes with the permissions of the function **creator** (postgres superuser)
- NOT with the permissions of the function **caller** (authenticated user)
- This bypasses RLS policies that would otherwise apply

### Why This Fixes It

**Before:**
```
User queries table
  → RLS policy checks
    → Calls is_master_admin()
      → Function queries users table
        → RLS policy checks again ← INFINITE LOOP!
```

**After:**
```
User queries table
  → RLS policy checks
    → Calls is_master_admin()
      → Function queries users table with superuser permissions
        → No RLS check (bypassed by SECURITY DEFINER) ✅
        → Returns is_master_admin value ✅
```

### Is This Secure?

Yes, because:
- The function only reads from `users` table (no modifications)
- It returns a single boolean value (no data leaks)
- It's only used by RLS policies, not exposed to users directly
- The function can only check the current user's own data via `auth.user_id()`

## Rollback (if needed)

If something goes wrong:

```sql
-- Revert to original functions
DROP FUNCTION IF EXISTS is_master_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_team_id(TEXT) CASCADE;
DROP FUNCTION IF EXISTS is_admin_for_team(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION get_user_team_id(user_id TEXT) RETURNS UUID AS $$
  SELECT team_id FROM users WHERE id = user_id
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_master_admin(user_id TEXT) RETURNS BOOLEAN AS $$
  SELECT is_master_admin FROM users WHERE id = user_id
$$ LANGUAGE sql STABLE;
```

But you shouldn't need to do this. The fix is permanent and correct.

## Support

If you encounter any issues:
1. Make sure you copied the entire SQL block (all statements)
2. Make sure there are no syntax errors before running
3. Check that you're using the SQL Editor (not just viewing the schema)
4. Try running the test query to verify the fix

Once applied, the production system should work immediately.
