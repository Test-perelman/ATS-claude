-- ================================================================
-- DEPLOY RLS POLICY FIXES FOR TEAM SIGNUP
-- Run this in Supabase SQL Editor after deploying code changes
-- ================================================================

-- Fix 1: Teams INSERT policy - allow service role during signup
DROP POLICY IF EXISTS teams_insert_policy ON teams;

CREATE POLICY teams_insert_policy ON teams
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR auth.uid() IS NULL  -- Allow service role (no user context during signup)
  );

-- Fix 2: Users INSERT policy - allow service role during signup
DROP POLICY IF EXISTS users_insert_policy ON users;

CREATE POLICY users_insert_policy ON users
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
    OR user_id::text = public._rls_current_user_id()
    OR auth.uid() IS NULL  -- Allow service role (no user context during signup)
  );

-- ================================================================
-- VERIFICATION QUERIES
-- Run these to verify RLS policies are working
-- ================================================================

-- Test 1: Check policies are in place
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename IN ('teams', 'users')
  AND policyname IN ('teams_insert_policy', 'users_insert_policy')
ORDER BY tablename, policyname;

-- Test 2: Check RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('teams', 'users');

-- Success: Should show RLS enabled (rowsecurity = true)
-- and both policies present

-- ================================================================
-- MANUAL TESTING IN BROWSER
-- ================================================================
-- 1. Go to /admin/signup
-- 2. Create test account:
--    First Name: Test
--    Last Name: User
--    Email: test@example.com
--    Company: Test Corp
--    Password: TestPassword123!
-- 3. Should see success message
-- 4. Check Supabase dashboard:
--    - teams table: should have 1 new row
--    - users table: should have 1 new row with team_id set
-- 5. Go to /admin/login
-- 6. Login with test@example.com / TestPassword123!
-- 7. Should redirect to dashboard
-- 8. Check browser console: should see "Login successful"
