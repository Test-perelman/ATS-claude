-- ============================================================================
-- VERIFY FIX WORKS - Run these queries in Supabase SQL Editor
-- ============================================================================

-- STEP 1: Verify service_role has permissions on all tables
-- ============================================================================

SELECT
  table_name,
  privilege,
  grantee
FROM information_schema.role_table_grants
WHERE grantee = 'service_role'
AND table_schema = 'public'
ORDER BY table_name, privilege;

-- Expected: Should show SELECT, INSERT, UPDATE, DELETE for all 16 tables
-- If this returns 0 rows, the GRANT migration did not apply

-- ============================================================================
-- STEP 2: Verify RLS is enabled on all tables
-- ============================================================================

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'users', 'teams', 'roles', 'role_permissions', 'permissions',
  'candidates', 'vendors', 'clients', 'job_requirements', 'submissions',
  'interviews', 'projects', 'timesheets', 'invoices', 'immigration', 'notes'
)
ORDER BY tablename;

-- Expected: All rows should show rowsecurity = true

-- ============================================================================
-- STEP 3: Check if any user records exist
-- ============================================================================

SELECT COUNT(*) as user_count FROM users;
SELECT id, email, team_id, role_id, is_master_admin FROM users LIMIT 5;

-- Expected: Should return user records with team_id and role_id filled

-- ============================================================================
-- STEP 4: Check if teams exist
-- ============================================================================

SELECT COUNT(*) as team_count FROM teams;
SELECT id, name FROM teams LIMIT 5;

-- Expected: Should return team records

-- ============================================================================
-- STEP 5: Verify RLS policies exist
-- ============================================================================

SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
LIMIT 10;

-- Expected: Should show multiple policies for the users table

-- ============================================================================
-- STEP 6: Test basic query (verify no permission errors)
-- ============================================================================

-- This should work without "permission denied" error
SELECT COUNT(*) FROM candidates;
SELECT COUNT(*) FROM vendors;
SELECT COUNT(*) FROM clients;

-- ============================================================================
-- FINAL CHECK: If all above queries succeed without permission errors,
--             the fix is working correctly!
-- ============================================================================
