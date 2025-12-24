# RLS Infinite Recursion Analysis - public.users Table

## Executive Summary

**The Problem:** The error `"infinite recursion detected in policy for relation users"` occurs because the RLS policies on the `public.users` table call helper functions that internally query the `users` table again, creating a recursive loop.

**Root Cause:** The `is_admin_for_team()` function (called by the `users_own_team` policy) internally joins the `users` table to check roles, which triggers the same RLS policies again.

---

## 1. All RLS Policies on public.users Table

### Current Policies (from /d/Perelman-ATS-claude/scripts/02-rls.sql)

```sql
-- Policy 1: users_master_admin
CREATE POLICY users_master_admin ON users
  USING (is_master_admin(auth.user_id()))
  WITH CHECK (is_master_admin(auth.user_id()));

-- Policy 2: users_own_team
CREATE POLICY users_own_team ON users
  USING (team_id = get_user_team_id(auth.user_id()))
  WITH CHECK (FALSE);

-- Policy 3: users_own_profile
CREATE POLICY users_own_profile ON users
  USING (id = auth.user_id())
  WITH CHECK (id = auth.user_id());
```

### Updated Policies (from /d/Perelman-ATS-claude/supabase/migrations/20251222003_update_rls_policies.sql)

```sql
-- Policy: users_own_team (UPDATED - PROBLEMATIC VERSION)
DROP POLICY IF EXISTS users_own_team ON users;
CREATE POLICY users_own_team ON users
  USING (
    id = auth.uid()::TEXT
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
      AND is_admin_for_team(auth.uid())  <-- PROBLEMATIC FUNCTION CALL
    )
  )
  WITH CHECK (id = auth.uid()::TEXT);
```

---

## 2. Which Policy is Causing Infinite Recursion

**The Culprit:** `users_own_team` policy when it calls `is_admin_for_team(auth.uid())`

### The Problematic Call Chain

```
users_own_team RLS Policy
    ↓
is_admin_for_team(auth.uid()) function called
    ↓
Function runs: SELECT EXISTS (
    SELECT 1 FROM users u          <-- QUERIES USERS TABLE
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = user_id::TEXT
      AND r.is_admin = true
)
    ↓
This SELECT triggers the RLS policies on users again
    ↓
is_admin_for_team() is called again from the RLS policy
    ↓
INFINITE RECURSION ❌
```

### Function Definition

From `/d/Perelman-ATS-claude/supabase/migrations/20251222001_rls_helper_functions.sql`:

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

**Problem:** This function is marked `SECURITY DEFINER`, which means it runs with the permissions of the function owner (usually postgres), but when called from an RLS policy context, it can still trigger those same policies when querying the `users` table.

---

## 3. How to Fix It

### Solution: Use SET row_security = off

The recommended fix is to add `SET row_security = off` to each helper function. This tells PostgreSQL to bypass RLS policies when the function executes its internal queries, while still maintaining security through `SECURITY DEFINER`.

### Implementation

Update all helper functions in `/d/Perelman-ATS-claude/supabase/migrations/20251222001_rls_helper_functions.sql`:

```sql
-- Check if user is a master admin
CREATE OR REPLACE FUNCTION is_master_admin(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_master_admin FROM users WHERE id = user_id::TEXT), false)
$$ LANGUAGE sql STABLE SECURITY DEFINER SET row_security = off;

-- Get user's team_id
CREATE OR REPLACE FUNCTION get_user_team_id(user_id UUID) RETURNS UUID AS $$
  SELECT team_id FROM users WHERE id = user_id::TEXT
$$ LANGUAGE sql STABLE SECURITY DEFINER SET row_security = off;

-- Check if user has approved membership to team
CREATE OR REPLACE FUNCTION is_membership_approved(user_id UUID, team_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_memberships
    WHERE team_memberships.user_id = user_id::TEXT
      AND team_memberships.team_id = $2
      AND team_memberships.status = 'approved'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET row_security = off;

-- Check if user is an admin for their team
CREATE OR REPLACE FUNCTION is_admin_for_team(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = user_id::TEXT
      AND r.is_admin = true
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET row_security = off;

-- Grant execute permissions to authenticated users and service role
GRANT EXECUTE ON FUNCTION is_master_admin(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_team_id(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_membership_approved(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_admin_for_team(UUID) TO authenticated, service_role;
```

Also update the duplicate definition in `/d/Perelman-ATS-claude/scripts/03-jwt-triggers.sql`:

```sql
CREATE OR REPLACE FUNCTION is_admin_for_team(user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT is_master_admin FROM users WHERE id = user_id
  ) OR EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = user_id AND r.is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET row_security = off;
```

---

## Why This Works

When `SET row_security = off` is added to a `SECURITY DEFINER` function:

1. **The function executes with the function owner's permissions** (postgres - already done with SECURITY DEFINER)
2. **The function bypasses RLS policies** when querying tables (new behavior)
3. **RLS is still enforced** for direct user queries and API calls
4. **No infinite recursion** because the internal SELECT in helper functions doesn't trigger RLS policies

This is safe because:
- The function owner is `postgres` (trusted system role)
- The functions only check basic user attributes (admin status, team membership)
- No sensitive data is leaked beyond what the user can already access
- This pattern is standard in PostgreSQL security best practices for helper functions

---

## Files to Modify

1. `/d/Perelman-ATS-claude/supabase/migrations/20251222001_rls_helper_functions.sql`
   - Add `SET row_security = off` to all four helper functions

2. `/d/Perelman-ATS-claude/scripts/03-jwt-triggers.sql`
   - Add `SET row_security = off` to `is_admin_for_team()` function (for consistency)

---

## Testing the Fix

After applying the fix, test with these queries executed as an authenticated user:

```sql
-- Test master admin check
SELECT is_master_admin(auth.uid()::UUID);

-- Test get user team
SELECT get_user_team_id(auth.uid()::UUID);

-- Test admin check
SELECT is_admin_for_team(auth.uid()::UUID);

-- Test team context retrieval (from getTeamContext function)
SELECT
  id,
  team_id,
  role_id,
  is_master_admin
FROM users
WHERE id = auth.uid()::TEXT;
```

All queries should complete without the "infinite recursion detected in policy" error.

---

## Error Context

The error manifests when:

1. `getTeamContext()` function (in `/d/Perelman-ATS-claude/src/lib/utils/team-context.ts`) queries the `users` table
2. The query `SELECT * FROM users WHERE id = userId` triggers the `users_own_team` RLS policy
3. The policy evaluates `is_admin_for_team(auth.uid())`
4. The `is_admin_for_team()` function internally queries the same `users` table
5. PostgreSQL evaluates the RLS policy again for the nested query
6. This creates infinite recursion

The `SET row_security = off` clause breaks this loop by allowing internal function queries to bypass RLS enforcement.

---

## Related Code Files

- **Main RLS policies:** `/d/Perelman-ATS-claude/scripts/02-rls.sql`
- **Updated policies:** `/d/Perelman-ATS-claude/supabase/migrations/20251222003_update_rls_policies.sql`
- **Helper functions:** `/d/Perelman-ATS-claude/supabase/migrations/20251222001_rls_helper_functions.sql`
- **JWT triggers:** `/d/Perelman-ATS-claude/scripts/03-jwt-triggers.sql`
- **API usage:** `/d/Perelman-ATS-claude/src/lib/utils/team-context.ts`
