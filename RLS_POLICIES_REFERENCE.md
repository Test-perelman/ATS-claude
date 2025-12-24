# RLS Policies Reference - public.users Table

## Complete Policy Inventory

### Policy 1: users_master_admin

**Location:** `/d/Perelman-ATS-claude/scripts/02-rls.sql` and migrations

```sql
CREATE POLICY users_master_admin ON users
  USING (is_master_admin(auth.user_id()))
  WITH CHECK (is_master_admin(auth.user_id()));
```

**Purpose:** Master admins can see all users and modify any user record

**How it works:**
1. For SELECT: `is_master_admin(auth.user_id())` must return TRUE
2. For UPDATE/DELETE: `is_master_admin(auth.user_id())` must return TRUE

**Helper function called:** `is_master_admin(TEXT)`

---

### Policy 2: users_own_team

**Location:** `/d/Perelman-ATS-claude/scripts/02-rls.sql` (original)

```sql
CREATE POLICY users_own_team ON users
  USING (team_id = get_user_team_id(auth.user_id()))
  WITH CHECK (FALSE);
```

**Updated version in migration 20251222003:**

```sql
DROP POLICY IF EXISTS users_own_team ON users;
CREATE POLICY users_own_team ON users
  USING (
    id = auth.uid()::TEXT
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
      AND is_admin_for_team(auth.uid())  <-- INFINITE RECURSION HERE
    )
  )
  WITH CHECK (id = auth.uid()::TEXT);
```

**Purpose:**
- Users can see other users in their team if they are an admin and approved
- Users can always see their own profile

**How it works:**
1. For SELECT: User can see their own profile OR
   - User's team matches resource's team AND
   - User has approved team membership AND
   - User is an admin in their team

2. For UPDATE/DELETE: User can only modify their own profile

**Helper functions called:**
- `get_user_team_id(UUID)` - safe, doesn't cause recursion
- `is_membership_approved(UUID, UUID)` - safe, doesn't cause recursion
- `is_admin_for_team(UUID)` - **PROBLEMATIC** ← This causes infinite recursion

---

### Policy 3: users_own_profile

**Location:** `/d/Perelman-ATS-claude/scripts/02-rls.sql`

```sql
CREATE POLICY users_own_profile ON users
  USING (id = auth.user_id())
  WITH CHECK (id = auth.user_id());
```

**Purpose:** Users can see and modify their own profile

**How it works:**
1. For SELECT: Only if row ID matches authenticated user ID
2. For UPDATE/DELETE: Only if row ID matches authenticated user ID

**Helper functions called:** None - direct comparison, no recursion risk

---

## Helper Functions Reference

### Function 1: is_master_admin(user_id TEXT)

**Location:** `/d/Perelman-ATS-claude/supabase/migrations/20251222001_rls_helper_functions.sql`

**Current (Problematic):**
```sql
CREATE OR REPLACE FUNCTION is_master_admin(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_master_admin FROM users WHERE id = user_id::TEXT), false)
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Fixed:**
```sql
CREATE OR REPLACE FUNCTION is_master_admin(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_master_admin FROM users WHERE id = user_id::TEXT), false)
$$ LANGUAGE sql STABLE SECURITY DEFINER SET row_security = off;
```

**What it does:** Returns TRUE if the user's `is_master_admin` column is TRUE

**Used by policies:** `users_master_admin`

**Recursion risk:** YES - queries `users` table

---

### Function 2: get_user_team_id(user_id UUID)

**Location:** `/d/Perelman-ATS-claude/supabase/migrations/20251222001_rls_helper_functions.sql`

**Current:**
```sql
CREATE OR REPLACE FUNCTION get_user_team_id(user_id UUID) RETURNS UUID AS $$
  SELECT team_id FROM users WHERE id = user_id::TEXT
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Fixed:**
```sql
CREATE OR REPLACE FUNCTION get_user_team_id(user_id UUID) RETURNS UUID AS $$
  SELECT team_id FROM users WHERE id = user_id::TEXT
$$ LANGUAGE sql STABLE SECURITY DEFINER SET row_security = off;
```

**What it does:** Returns the user's team_id

**Used by policies:** `users_own_team`, `roles_own_team`, `teams_own_team`, and all business table policies

**Recursion risk:** YES - queries `users` table

---

### Function 3: is_membership_approved(user_id UUID, team_id UUID)

**Location:** `/d/Perelman-ATS-claude/supabase/migrations/20251222001_rls_helper_functions.sql`

**Current:**
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

**Fixed:**
```sql
CREATE OR REPLACE FUNCTION is_membership_approved(user_id UUID, team_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_memberships
    WHERE team_memberships.user_id = user_id::TEXT
      AND team_memberships.team_id = $2
      AND team_memberships.status = 'approved'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET row_security = off;
```

**What it does:** Returns TRUE if user has approved membership to the team

**Used by policies:** `users_own_team`, and all business table policies

**Recursion risk:** LOWER - queries `team_memberships`, not `users`, but should still be fixed for consistency

---

### Function 4: is_admin_for_team(user_id UUID)

**Location:** `/d/Perelman-ATS-claude/supabase/migrations/20251222001_rls_helper_functions.sql`

**Current (Problematic):**
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

**Fixed:**
```sql
CREATE OR REPLACE FUNCTION is_admin_for_team(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = user_id::TEXT
      AND r.is_admin = true
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET row_security = off;
```

**What it does:** Returns TRUE if user's role has is_admin = TRUE

**Used by policies:** `users_own_team`, `roles_own_team`, and all business table policies

**Recursion risk:** HIGHEST - directly queries `users` table, which triggers RLS policies again

**This is the PRIMARY CAUSE of the infinite recursion**

---

## Policy Evaluation Order

When a query is executed, PostgreSQL evaluates policies in this order:

```
1. Check if authenticated user ID is provided
2. For each row in the result set:
   3. Evaluate all policies that apply (OR logic between policies)
   4. If any policy USING clause returns TRUE, include the row
   5. If all policies return FALSE, exclude the row
6. Apply WITH CHECK constraints for write operations
```

For `public.users` table:

```
Query: SELECT * FROM users WHERE id = 'user-123'
  ↓
Evaluate users_master_admin policy
  ├─ Call is_master_admin(auth.user_id())
  │  └─ Query: SELECT is_master_admin FROM users WHERE id = auth.user_id()::TEXT
  │     └─ TRIGGERS RLS POLICIES AGAIN! (infinite recursion)
  │
OR Evaluate users_own_team policy
  ├─ Check: id = auth.uid()::TEXT
  │  └─ Direct comparison, no function call
  │
  OR Check: team_id = get_user_team_id(auth.uid())
  │  ├─ Call get_user_team_id(auth.uid())
  │  │  └─ Query: SELECT team_id FROM users WHERE id = auth.user_id()::TEXT
  │  │     └─ TRIGGERS RLS POLICIES AGAIN! (infinite recursion)
  │
  AND Check: is_membership_approved(auth.uid(), team_id)
  │  ├─ Call is_membership_approved(auth.uid(), team_id)
  │  │  └─ Query: SELECT * FROM team_memberships WHERE ...
  │  │     └─ OK, doesn't query users
  │
  AND Check: is_admin_for_team(auth.uid())
     ├─ Call is_admin_for_team(auth.uid())
     │  └─ Query: SELECT * FROM users u JOIN roles WHERE ...
     │     └─ TRIGGERS RLS POLICIES AGAIN! (infinite recursion)
│
OR Evaluate users_own_profile policy
  ├─ Check: id = auth.user_id()
  │  └─ Direct comparison, no function call, no recursion
```

**Solution:** Add `SET row_security = off` to helper functions so they can query tables without triggering RLS policies.

---

## Policy Call Dependency Graph

```
users_master_admin
└── is_master_admin(UUID)
    └── SELECT FROM users [RECURSIVE]

users_own_team
├── get_user_team_id(UUID)
│   └── SELECT FROM users [RECURSIVE]
├── is_membership_approved(UUID, UUID)
│   └── SELECT FROM team_memberships [OK]
└── is_admin_for_team(UUID)
    └── SELECT FROM users [RECURSIVE]

users_own_profile
└── Direct comparison [OK]
```

**Policies with recursion risk:** users_master_admin, users_own_team

---

## Summary Table

| Policy | Recursive? | Helper Functions | Fix Applied |
|--------|-----------|------------------|------------|
| users_master_admin | YES | is_master_admin() | SET row_security = off |
| users_own_team | YES | get_user_team_id(), is_membership_approved(), is_admin_for_team() | SET row_security = off on all |
| users_own_profile | NO | None | Not needed |

---

## Implementation Notes

All helper functions should be updated at the same time to avoid partial deployment issues. The fix is cumulative - once all functions have `SET row_security = off`, the recursion will be completely prevented.

Test each function individually after applying the fix to ensure they work correctly.
