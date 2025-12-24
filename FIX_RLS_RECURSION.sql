-- ============================================================================
-- FIX: RLS Infinite Recursion on public.users Table
-- ============================================================================
--
-- This SQL script fixes the "infinite recursion detected in policy for
-- relation users" error by adding SET row_security = off to all helper
-- functions used by RLS policies.
--
-- Apply this to your Supabase project awujhuncfghjshggkqyo after reviewing
-- the changes.
--
-- ============================================================================

-- Step 1: Update all helper functions to bypass RLS when they query tables
-- ============================================================================

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

-- Check if user is an admin for their team (UUID version)
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

-- ============================================================================
-- Step 2: Also update the TEXT version of is_admin_for_team if it exists
-- ============================================================================

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

-- ============================================================================
-- Step 3: Verify the fix with test queries
-- ============================================================================

-- Test that functions can be called without infinite recursion
-- Execute these as an authenticated user:

-- SELECT is_master_admin(auth.uid()::UUID);
-- SELECT get_user_team_id(auth.uid()::UUID);
-- SELECT is_admin_for_team(auth.uid()::UUID);

-- Test that RLS policies still work correctly:
-- SELECT id, email, team_id FROM users LIMIT 5;

-- Test that the original getTeamContext query works:
-- SELECT
--   id,
--   team_id,
--   role_id,
--   is_master_admin
-- FROM users
-- WHERE id = auth.uid()::TEXT;

-- ============================================================================
-- Step 4: Verify the policies (no changes needed, just verification)
-- ============================================================================

-- The following policies should already be in place:
-- - users_master_admin
-- - users_own_team
-- - users_own_profile
--
-- They will now work correctly because the helper functions no longer
-- cause infinite recursion when evaluating RLS policies.

-- ============================================================================
-- EXPLANATION
-- ============================================================================
--
-- The SET row_security = off clause tells PostgreSQL to bypass RLS policy
-- evaluation when the function executes its queries. This is safe because:
--
-- 1. The functions are marked SECURITY DEFINER
--    - They run with the privileges of the function owner (postgres)
--    - postgres is a trusted system role
--
-- 2. The functions only check public user attributes
--    - is_master_admin: boolean flag
--    - team_id: UUID of user's team
--    - Membership status: team membership records
--    - Admin status: user's role is_admin flag
--
-- 3. RLS is still enforced for direct user queries
--    - When your application queries users, RLS policies still apply
--    - Only the helper functions bypass RLS during their internal queries
--
-- This is a standard PostgreSQL best practice for helper functions used in
-- RLS policies to avoid infinite recursion.
--
-- ============================================================================
