-- Fix RLS policies to allow authenticated users to access their own data

-- Step 1: Ensure RLS is enabled on critical tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies that might be causing issues
DROP POLICY IF EXISTS users_master_admin ON users;
DROP POLICY IF EXISTS users_own_team ON users;
DROP POLICY IF EXISTS users_own_profile ON users;

DROP POLICY IF EXISTS teams_master_admin ON teams;
DROP POLICY IF EXISTS teams_own_team ON teams;

-- Step 3: Grant basic permissions to authenticated role
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT ON teams TO authenticated;
GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;
GRANT SELECT ON permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON candidates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON team_memberships TO authenticated;

-- Step 4: Create new, simpler RLS policies

-- Users table: Allow authenticated users to see their own record
CREATE POLICY users_view_self ON users
  FOR SELECT
  USING (id = auth.uid());

-- Users table: Allow authenticated users to see team members (same team)
CREATE POLICY users_view_team_members ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = users.team_id
        AND tm.status = 'approved'
    )
  );

-- Users table: Allow master admins to see everyone
CREATE POLICY users_view_all_as_admin ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users admin
      WHERE admin.id = auth.uid()
        AND admin.is_master_admin = true
    )
  );

-- Users table: Allow authenticated users to update their own record
CREATE POLICY users_update_self ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Teams table: Allow authenticated users to see their own team
CREATE POLICY teams_view_own ON teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = teams.id
        AND tm.status = 'approved'
    )
  );

-- Teams table: Allow master admins to see all teams
CREATE POLICY teams_view_all_as_admin ON teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users admin
      WHERE admin.id = auth.uid()
        AND admin.is_master_admin = true
    )
  );

-- Roles table: Allow authenticated users to see roles for their team
CREATE POLICY roles_view_team ON roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = roles.team_id
        AND tm.status = 'approved'
    )
  );

-- Candidates table: Allow authenticated users to see candidates in their team
CREATE POLICY candidates_view_own_team ON candidates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = candidates.team_id
        AND tm.status = 'approved'
    )
  );

-- Candidates table: Allow authenticated users to create candidates in their team
CREATE POLICY candidates_create_own_team ON candidates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = candidates.team_id
        AND tm.status = 'approved'
    )
  );

-- Team memberships: Users can view their own memberships
CREATE POLICY team_memberships_view_self ON team_memberships
  FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

-- Team memberships: Admins can manage memberships
CREATE POLICY team_memberships_manage_as_admin ON team_memberships
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
      AND (r.is_admin = true OR u.is_master_admin = true)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, service_role;
