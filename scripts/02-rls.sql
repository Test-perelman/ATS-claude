-- Row-Level Security Policies
-- Master Admin: Bypass all
-- Local Admin: Access own team
-- Regular Users: Own team data only

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE immigration ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER: Get user data
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.user_id() RETURNS TEXT AS $$
  SELECT auth.uid()::TEXT
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_user_team_id(user_id TEXT) RETURNS UUID AS $$
  SELECT team_id FROM users WHERE id = user_id
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_master_admin(user_id TEXT) RETURNS BOOLEAN AS $$
  SELECT is_master_admin FROM users WHERE id = user_id
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- TEAMS
-- ============================================================================

CREATE POLICY teams_master_admin ON teams
  USING (is_master_admin(auth.user_id()))
  WITH CHECK (is_master_admin(auth.user_id()));

CREATE POLICY teams_own_team ON teams
  USING (id IN (SELECT team_id FROM users WHERE id = auth.user_id()))
  WITH CHECK (FALSE);

-- ============================================================================
-- USERS
-- ============================================================================

CREATE POLICY users_master_admin ON users
  USING (is_master_admin(auth.user_id()))
  WITH CHECK (is_master_admin(auth.user_id()));

CREATE POLICY users_own_team ON users
  USING (team_id = get_user_team_id(auth.user_id()))
  WITH CHECK (FALSE);

CREATE POLICY users_own_profile ON users
  USING (id = auth.user_id())
  WITH CHECK (id = auth.user_id());

-- ============================================================================
-- ROLES
-- ============================================================================

CREATE POLICY roles_master_admin ON roles
  USING (is_master_admin(auth.user_id()))
  WITH CHECK (is_master_admin(auth.user_id()));

CREATE POLICY roles_own_team ON roles
  USING (team_id = get_user_team_id(auth.user_id()))
  WITH CHECK (team_id = get_user_team_id(auth.user_id()) AND is_admin_for_team(auth.user_id()));

-- ============================================================================
-- PERMISSIONS (Read-only)
-- ============================================================================

CREATE POLICY permissions_read ON permissions
  USING (TRUE)
  WITH CHECK (FALSE);

-- ============================================================================
-- ROLE_PERMISSIONS
-- ============================================================================

CREATE POLICY role_permissions_master_admin ON role_permissions
  USING (is_master_admin(auth.user_id()))
  WITH CHECK (is_master_admin(auth.user_id()));

CREATE POLICY role_permissions_own_team ON role_permissions
  USING (
    role_id IN (
      SELECT id FROM roles
      WHERE team_id = get_user_team_id(auth.user_id())
    )
  )
  WITH CHECK (
    role_id IN (
      SELECT id FROM roles
      WHERE team_id = get_user_team_id(auth.user_id())
    ) AND is_admin_for_team(auth.user_id())
  );

-- ============================================================================
-- BUSINESS TABLES: Pattern = Master admin sees all, regular users see own team
-- ============================================================================

-- CANDIDATES
CREATE POLICY candidates_master_admin ON candidates
  USING (is_master_admin(auth.user_id()))
  WITH CHECK (is_master_admin(auth.user_id()));

CREATE POLICY candidates_own_team ON candidates
  USING (team_id = get_user_team_id(auth.user_id()))
  WITH CHECK (team_id = get_user_team_id(auth.user_id()));

-- VENDORS
CREATE POLICY vendors_master_admin ON vendors
  USING (is_master_admin(auth.user_id()))
  WITH CHECK (is_master_admin(auth.user_id()));

CREATE POLICY vendors_own_team ON vendors
  USING (team_id = get_user_team_id(auth.user_id()))
  WITH CHECK (team_id = get_user_team_id(auth.user_id()));

-- CLIENTS
CREATE POLICY clients_master_admin ON clients
  USING (is_master_admin(auth.user_id()))
  WITH CHECK (is_master_admin(auth.user_id()));

CREATE POLICY clients_own_team ON clients
  USING (team_id = get_user_team_id(auth.user_id()))
  WITH CHECK (team_id = get_user_team_id(auth.user_id()));

-- JOB_REQUIREMENTS
CREATE POLICY job_requirements_master_admin ON job_requirements
  USING (is_master_admin(auth.user_id()))
  WITH CHECK (is_master_admin(auth.user_id()));

CREATE POLICY job_requirements_own_team ON job_requirements
  USING (team_id = get_user_team_id(auth.user_id()))
  WITH CHECK (team_id = get_user_team_id(auth.user_id()));

-- SUBMISSIONS
CREATE POLICY submissions_master_admin ON submissions
  USING (is_master_admin(auth.user_id()))
  WITH CHECK (is_master_admin(auth.user_id()));

CREATE POLICY submissions_own_team ON submissions
  USING (team_id = get_user_team_id(auth.user_id()))
  WITH CHECK (team_id = get_user_team_id(auth.user_id()));

-- INTERVIEWS
CREATE POLICY interviews_master_admin ON interviews
  USING (is_master_admin(auth.user_id()))
  WITH CHECK (is_master_admin(auth.user_id()));

CREATE POLICY interviews_own_team ON interviews
  USING (team_id = get_user_team_id(auth.user_id()))
  WITH CHECK (team_id = get_user_team_id(auth.user_id()));

-- PROJECTS
CREATE POLICY projects_master_admin ON projects
  USING (is_master_admin(auth.user_id()))
  WITH CHECK (is_master_admin(auth.user_id()));

CREATE POLICY projects_own_team ON projects
  USING (team_id = get_user_team_id(auth.user_id()))
  WITH CHECK (team_id = get_user_team_id(auth.user_id()));

-- TIMESHEETS
CREATE POLICY timesheets_master_admin ON timesheets
  USING (is_master_admin(auth.user_id()))
  WITH CHECK (is_master_admin(auth.user_id()));

CREATE POLICY timesheets_own_team ON timesheets
  USING (team_id = get_user_team_id(auth.user_id()))
  WITH CHECK (team_id = get_user_team_id(auth.user_id()));

-- INVOICES
CREATE POLICY invoices_master_admin ON invoices
  USING (is_master_admin(auth.user_id()))
  WITH CHECK (is_master_admin(auth.user_id()));

CREATE POLICY invoices_own_team ON invoices
  USING (team_id = get_user_team_id(auth.user_id()))
  WITH CHECK (team_id = get_user_team_id(auth.user_id()));

-- IMMIGRATION
CREATE POLICY immigration_master_admin ON immigration
  USING (is_master_admin(auth.user_id()))
  WITH CHECK (is_master_admin(auth.user_id()));

CREATE POLICY immigration_own_team ON immigration
  USING (team_id = get_user_team_id(auth.user_id()))
  WITH CHECK (team_id = get_user_team_id(auth.user_id()));

-- NOTES
CREATE POLICY notes_master_admin ON notes
  USING (is_master_admin(auth.user_id()))
  WITH CHECK (is_master_admin(auth.user_id()));

CREATE POLICY notes_own_team ON notes
  USING (team_id = get_user_team_id(auth.user_id()))
  WITH CHECK (team_id = get_user_team_id(auth.user_id()));
