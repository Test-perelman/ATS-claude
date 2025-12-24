-- ============================================================================
-- Fix RLS Infinite Recursion
-- ============================================================================
--
-- PROBLEM: The is_master_admin() and get_user_team_id() functions query the
-- users table, which has RLS policies that call these same functions, creating
-- infinite recursion.
--
-- SOLUTION: Recreate these functions with SECURITY DEFINER to bypass RLS
-- when checking permissions. This allows the functions to query users data
-- without triggering RLS checks again.
--
-- ============================================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS is_master_admin(TEXT);
DROP FUNCTION IF EXISTS get_user_team_id(TEXT);

-- Recreate with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION get_user_team_id(user_id TEXT)
RETURNS UUID AS $$
  SELECT team_id FROM users WHERE id = user_id
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_master_admin(user_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT is_master_admin FROM users WHERE id = user_id
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Also need to fix is_admin_for_team if it exists
DROP FUNCTION IF EXISTS is_admin_for_team(TEXT);

CREATE OR REPLACE FUNCTION is_admin_for_team(user_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT COALESCE((
    SELECT r.is_admin
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = user_id
  ), FALSE)
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_team_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_master_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_for_team(TEXT) TO authenticated;
