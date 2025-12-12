# RLS Policy Fix - Quick Reference

## THE PROBLEM
Error: "Failed to create team: permission denied for table teams"

**Why:** The RLS INSERT policy checked if user was a master admin, but during signup:
- No user is authenticated yet
- The user being created doesn't exist in `users` table
- The policy lookup fails → permission denied

## THE SOLUTION
Change the INSERT policies to allow **auth.uid() IS NULL** (service role indicator)

### Fix 1: Teams INSERT Policy

**Before:**
```sql
CREATE POLICY teams_insert_policy ON teams
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
  );
```

**After:**
```sql
CREATE POLICY teams_insert_policy ON teams
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR auth.uid() IS NULL  -- Allow service role (no user context during signup)
  );
```

### Fix 2: Users INSERT Policy

**Before:**
```sql
CREATE POLICY users_insert_policy ON users
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
    OR user_id::text = public._rls_current_user_id()
  );
```

**After:**
```sql
CREATE POLICY users_insert_policy ON users
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
    OR user_id::text = public._rls_current_user_id()
    OR auth.uid() IS NULL  -- Allow service role (no user context during signup)
  );
```

## HOW IT WORKS

1. **Service Role Key** - Uses `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
2. **No User Context** - When service role creates records, `auth.uid()` returns NULL
3. **Policy Check** - `auth.uid() IS NULL` evaluates to TRUE → INSERT allowed
4. **Security** - Regular authenticated users still must pass other conditions

## DEPLOYMENT STEPS

### Option A: Apply via SQL Editor (Quickest)
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy content of `DEPLOY_RLS_FIXES.sql`
4. Execute in SQL Editor
5. Verify success message

### Option B: Apply via CLI
```bash
npx supabase db push scripts/rls-policies-v2.sql
```

### Option C: Manual (one-time fix)
Run these exact commands in Supabase SQL Editor:

```sql
DROP POLICY IF EXISTS teams_insert_policy ON teams;

CREATE POLICY teams_insert_policy ON teams
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS users_insert_policy ON users;

CREATE POLICY users_insert_policy ON users
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
    OR user_id::text = public._rls_current_user_id()
    OR auth.uid() IS NULL
  );
```

## TEST IT WORKS

### Test 1: Verify Policies
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename IN ('teams', 'users')
  AND policyname IN ('teams_insert_policy', 'users_insert_policy');
```

Expected output:
```
teams_insert_policy   | INSERT
users_insert_policy   | INSERT
```

### Test 2: Try Signup
1. Navigate to `/admin/signup`
2. Fill form:
   - First Name: `Test`
   - Last Name: `User`
   - Email: `test123@example.com`
   - Company: `Test Corp`
   - Password: `TestPassword123!`
3. Click "Create Account"
4. Should see success message (NOT permission denied error)

### Test 3: Verify in Database
In Supabase Dashboard:

**Teams table:**
- Should have new row with team_name = "Test Corp"

**Users table:**
- Should have new row with email = "test123@example.com"
- Should have team_id set to the new team's ID

### Test 4: Login
1. Navigate to `/admin/login`
2. Enter: `test123@example.com` / `TestPassword123!`
3. Should redirect to dashboard
4. Should NOT see "permission denied" error

## TROUBLESHOOTING

### Still getting "permission denied for table teams"
- ✓ Did you run the SQL fix?
- ✓ Is the policy showing `auth.uid() IS NULL` in it?
- ✓ Did you reload the page after deploying?

### Policy not found
- ✓ Make sure you're running in the right Supabase project
- ✓ Check the schema is `public`

### Still can't login
- ✓ Check `/api/auth/update-last-login` is deployed (has error handling)
- ✓ Check `/lib/supabase/auth-server.ts` is using admin client

## KEY POINTS

✅ **Why `auth.uid() IS NULL` works:**
- Service role makes requests without user authentication
- `auth.uid()` returns NULL for service role
- Policy allows INSERT when `auth.uid() IS NULL`
- Effectively whitelists service role operations

✅ **Security is maintained because:**
- Regular users still must pass other policy checks
- Master admin check still in place
- Team/user scoping still enforced
- Only service role (server-side only) can bypass

✅ **This is the standard Supabase pattern for:**
- User signup flows
- Admin provisioning
- Bulk operations via backend

## FILES MODIFIED

- `scripts/rls-policies-v2.sql` - RLS policies (lines 191-194, 288-294)
- `DEPLOY_RLS_FIXES.sql` - Ready-to-run SQL script
- `src/lib/supabase/auth-server.ts` - Already uses admin client ✓
- `src/app/api/auth/update-last-login/route.ts` - Already has error handling ✓

## NEXT STEPS

1. Deploy RLS fixes (choose option A, B, or C above)
2. Clear browser cache (hard refresh: Ctrl+Shift+R)
3. Test signup flow
4. Test login flow
5. Verify data in Supabase dashboard

Success = signup works + login works + data properly isolated by team
