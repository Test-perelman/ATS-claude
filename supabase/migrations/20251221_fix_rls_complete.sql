-- ============================================================================
-- COMPLETE RLS FIX: Schema + Policies + Grants
-- Fixes: Column name bugs, missing grants, redundant policies
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL BROKEN POLICIES AND FUNCTIONS
-- ============================================================================

DROP POLICY IF EXISTS users_master_admin ON users;
DROP POLICY IF EXISTS users_own_team ON users;
DROP POLICY IF EXISTS users_own_profile ON users;
DROP POLICY IF EXISTS users_select_policy ON users;
DROP POLICY IF EXISTS users_insert_policy ON users;
DROP POLICY IF EXISTS users_update_policy ON users;
DROP POLICY IF EXISTS users_delete_policy ON users;

DROP POLICY IF EXISTS teams_master_admin ON teams;
DROP POLICY IF EXISTS teams_own_team ON teams;
DROP POLICY IF EXISTS teams_select_policy ON teams;
DROP POLICY IF EXISTS teams_insert_policy ON teams;
DROP POLICY IF EXISTS teams_update_policy ON teams;
DROP POLICY IF EXISTS teams_delete_policy ON teams;

DROP POLICY IF EXISTS roles_master_admin ON roles;
DROP POLICY IF EXISTS roles_own_team ON roles;
DROP POLICY IF EXISTS roles_select_policy ON roles;
DROP POLICY IF EXISTS roles_insert_policy ON roles;
DROP POLICY IF EXISTS roles_update_policy ON roles;
DROP POLICY IF EXISTS roles_delete_policy ON roles;

DROP POLICY IF EXISTS role_permissions_master_admin ON role_permissions;
DROP POLICY IF EXISTS role_permissions_own_team ON role_permissions;
DROP POLICY IF EXISTS role_permissions_select_policy ON role_permissions;
DROP POLICY IF EXISTS role_permissions_insert_policy ON role_permissions;
DROP POLICY IF EXISTS role_permissions_update_policy ON role_permissions;
DROP POLICY IF EXISTS role_permissions_delete_policy ON role_permissions;

DROP POLICY IF EXISTS permissions_read ON permissions;
DROP POLICY IF EXISTS permissions_select_policy ON permissions;
DROP POLICY IF EXISTS permissions_insert_policy ON permissions;

DROP POLICY IF EXISTS candidates_master_admin ON candidates;
DROP POLICY IF EXISTS candidates_own_team ON candidates;
DROP POLICY IF EXISTS candidates_select_policy ON candidates;
DROP POLICY IF EXISTS candidates_insert_policy ON candidates;
DROP POLICY IF EXISTS candidates_update_policy ON candidates;
DROP POLICY IF EXISTS candidates_delete_policy ON candidates;

DROP POLICY IF EXISTS vendors_master_admin ON vendors;
DROP POLICY IF EXISTS vendors_own_team ON vendors;
DROP POLICY IF EXISTS vendors_select_policy ON vendors;
DROP POLICY IF EXISTS vendors_insert_policy ON vendors;
DROP POLICY IF EXISTS vendors_update_policy ON vendors;
DROP POLICY IF EXISTS vendors_delete_policy ON vendors;

DROP POLICY IF EXISTS clients_master_admin ON clients;
DROP POLICY IF EXISTS clients_own_team ON clients;
DROP POLICY IF EXISTS clients_select_policy ON clients;
DROP POLICY IF EXISTS clients_insert_policy ON clients;
DROP POLICY IF EXISTS clients_update_policy ON clients;
DROP POLICY IF EXISTS clients_delete_policy ON clients;

DROP POLICY IF EXISTS job_requirements_master_admin ON job_requirements;
DROP POLICY IF EXISTS job_requirements_own_team ON job_requirements;
DROP POLICY IF EXISTS job_requirements_select_policy ON job_requirements;
DROP POLICY IF EXISTS job_requirements_insert_policy ON job_requirements;
DROP POLICY IF EXISTS job_requirements_update_policy ON job_requirements;
DROP POLICY IF EXISTS job_requirements_delete_policy ON job_requirements;

DROP POLICY IF EXISTS submissions_master_admin ON submissions;
DROP POLICY IF EXISTS submissions_own_team ON submissions;
DROP POLICY IF EXISTS submissions_select_policy ON submissions;
DROP POLICY IF EXISTS submissions_insert_policy ON submissions;
DROP POLICY IF EXISTS submissions_update_policy ON submissions;
DROP POLICY IF EXISTS submissions_delete_policy ON submissions;

DROP POLICY IF EXISTS interviews_master_admin ON interviews;
DROP POLICY IF EXISTS interviews_own_team ON interviews;
DROP POLICY IF EXISTS interviews_select_policy ON interviews;
DROP POLICY IF EXISTS interviews_insert_policy ON interviews;
DROP POLICY IF EXISTS interviews_update_policy ON interviews;
DROP POLICY IF EXISTS interviews_delete_policy ON interviews;

DROP POLICY IF EXISTS projects_master_admin ON projects;
DROP POLICY IF EXISTS projects_own_team ON projects;
DROP POLICY IF EXISTS projects_select_policy ON projects;
DROP POLICY IF EXISTS projects_insert_policy ON projects;
DROP POLICY IF EXISTS projects_update_policy ON projects;
DROP POLICY IF EXISTS projects_delete_policy ON projects;

DROP POLICY IF EXISTS timesheets_master_admin ON timesheets;
DROP POLICY IF EXISTS timesheets_own_team ON timesheets;
DROP POLICY IF EXISTS timesheets_select_policy ON timesheets;
DROP POLICY IF EXISTS timesheets_insert_policy ON timesheets;
DROP POLICY IF EXISTS timesheets_update_policy ON timesheets;
DROP POLICY IF EXISTS timesheets_delete_policy ON timesheets;

DROP POLICY IF EXISTS invoices_master_admin ON invoices;
DROP POLICY IF EXISTS invoices_own_team ON invoices;
DROP POLICY IF EXISTS invoices_select_policy ON invoices;
DROP POLICY IF EXISTS invoices_insert_policy ON invoices;
DROP POLICY IF EXISTS invoices_update_policy ON invoices;
DROP POLICY IF EXISTS invoices_delete_policy ON invoices;

DROP POLICY IF EXISTS immigration_master_admin ON immigration;
DROP POLICY IF EXISTS immigration_own_team ON immigration;
DROP POLICY IF EXISTS immigration_select_policy ON immigration;
DROP POLICY IF EXISTS immigration_insert_policy ON immigration;
DROP POLICY IF EXISTS immigration_update_policy ON immigration;
DROP POLICY IF EXISTS immigration_delete_policy ON immigration;

DROP POLICY IF EXISTS notes_master_admin ON notes;
DROP POLICY IF EXISTS notes_own_team ON notes;
DROP POLICY IF EXISTS notes_select_policy ON notes;
DROP POLICY IF EXISTS notes_insert_policy ON notes;
DROP POLICY IF EXISTS notes_update_policy ON notes;
DROP POLICY IF EXISTS notes_delete_policy ON notes;

-- Drop broken helper functions
DROP FUNCTION IF EXISTS public._rls_current_user_id() CASCADE;
DROP FUNCTION IF EXISTS public._rls_current_user_team_id() CASCADE;
DROP FUNCTION IF EXISTS public._rls_is_master_admin() CASCADE;
DROP FUNCTION IF EXISTS is_master_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_team_id(TEXT) CASCADE;

-- ============================================================================
-- STEP 2: CREATE CORRECT HELPER FUNCTIONS
-- ============================================================================

-- Get current user ID (returns TEXT to match public.users.id type)
CREATE OR REPLACE FUNCTION public._rls_current_user_id()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid()::text;
$$;

-- Get current user's team_id (CRITICAL FIX: use 'id' column, not 'user_id')
CREATE OR REPLACE FUNCTION public._rls_current_user_team_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT team_id FROM users WHERE id = auth.uid()::text LIMIT 1;
$$;

-- Check if current user is master admin (CRITICAL FIX: use 'id' column)
CREATE OR REPLACE FUNCTION public._rls_is_master_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(is_master_admin, FALSE)
  FROM users
  WHERE id = auth.uid()::text
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public._rls_current_user_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public._rls_current_user_team_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public._rls_is_master_admin() TO authenticated, anon;

-- ============================================================================
-- STEP 3: GRANT TABLE PERMISSIONS TO AUTHENTICATED + ANON ROLES
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT SELECT ON public.teams TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT SELECT ON public.roles TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT SELECT ON public.role_permissions TO anon;

GRANT SELECT ON public.permissions TO authenticated, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT SELECT ON public.candidates TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT SELECT ON public.vendors TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT ON public.clients TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_requirements TO authenticated;
GRANT SELECT ON public.job_requirements TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO authenticated;
GRANT SELECT ON public.submissions TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO authenticated;
GRANT SELECT ON public.interviews TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT ON public.projects TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.timesheets TO authenticated;
GRANT SELECT ON public.timesheets TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT ON public.invoices TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.immigration TO authenticated;
GRANT SELECT ON public.immigration TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT SELECT ON public.notes TO anon;

-- ============================================================================
-- STEP 4: CREATE MINIMAL, CORRECT RLS POLICIES
-- ============================================================================

-- ============================================================================
-- USERS TABLE: 5 policies for signup + access control
-- ============================================================================

-- 1. Master admins see all users
CREATE POLICY users_master_admin_all ON users
  FOR ALL
  USING (public._rls_is_master_admin())
  WITH CHECK (public._rls_is_master_admin());

-- 2. Users can read own row (critical for signup/onboarding)
CREATE POLICY users_read_self ON users
  FOR SELECT
  USING (id = public._rls_current_user_id());

-- 3. Users can update own row
CREATE POLICY users_update_self ON users
  FOR UPDATE
  USING (id = public._rls_current_user_id())
  WITH CHECK (id = public._rls_current_user_id());

-- 4. Service role bypass: function can insert during trigger
-- Allow insert when user is master admin OR (insert own record during signup)
CREATE POLICY users_insert_on_signup ON users
  FOR INSERT
  WITH CHECK (
    public._rls_is_master_admin()
    OR id = public._rls_current_user_id()
  );

-- 5. Team members can read other team members
CREATE POLICY users_read_team ON users
  FOR SELECT
  USING (
    team_id = public._rls_current_user_team_id()
    AND team_id IS NOT NULL
  );

-- ============================================================================
-- TEAMS TABLE: Master admin + own team access
-- ============================================================================

CREATE POLICY teams_master_admin_all ON teams
  FOR ALL
  USING (public._rls_is_master_admin())
  WITH CHECK (public._rls_is_master_admin());

CREATE POLICY teams_read_own ON teams
  FOR SELECT
  USING (id = public._rls_current_user_team_id());

-- ============================================================================
-- ROLES TABLE: Master admin + team isolation
-- ============================================================================

CREATE POLICY roles_master_admin_all ON roles
  FOR ALL
  USING (public._rls_is_master_admin())
  WITH CHECK (public._rls_is_master_admin());

CREATE POLICY roles_team_access ON roles
  FOR ALL
  USING (team_id = public._rls_current_user_team_id())
  WITH CHECK (team_id = public._rls_current_user_team_id());

-- ============================================================================
-- ROLE_PERMISSIONS TABLE: Master admin + team isolation
-- ============================================================================

CREATE POLICY role_permissions_master_admin_all ON role_permissions
  FOR ALL
  USING (
    public._rls_is_master_admin()
    OR EXISTS (
      SELECT 1 FROM roles
      WHERE id = role_permissions.role_id
      AND team_id = public._rls_current_user_team_id()
    )
  )
  WITH CHECK (
    public._rls_is_master_admin()
    OR EXISTS (
      SELECT 1 FROM roles
      WHERE id = role_permissions.role_id
      AND team_id = public._rls_current_user_team_id()
    )
  );

-- ============================================================================
-- PERMISSIONS TABLE: Read-only for authenticated users
-- ============================================================================

CREATE POLICY permissions_read ON permissions
  FOR SELECT
  USING (TRUE);

-- ============================================================================
-- BUSINESS TABLES: Master admin + team isolation pattern
-- ============================================================================

-- CANDIDATES
CREATE POLICY candidates_master_admin_all ON candidates
  FOR ALL
  USING (public._rls_is_master_admin())
  WITH CHECK (public._rls_is_master_admin());

CREATE POLICY candidates_team_access ON candidates
  FOR ALL
  USING (team_id = public._rls_current_user_team_id())
  WITH CHECK (team_id = public._rls_current_user_team_id());

-- VENDORS
CREATE POLICY vendors_master_admin_all ON vendors
  FOR ALL
  USING (public._rls_is_master_admin())
  WITH CHECK (public._rls_is_master_admin());

CREATE POLICY vendors_team_access ON vendors
  FOR ALL
  USING (team_id = public._rls_current_user_team_id())
  WITH CHECK (team_id = public._rls_current_user_team_id());

-- CLIENTS
CREATE POLICY clients_master_admin_all ON clients
  FOR ALL
  USING (public._rls_is_master_admin())
  WITH CHECK (public._rls_is_master_admin());

CREATE POLICY clients_team_access ON clients
  FOR ALL
  USING (team_id = public._rls_current_user_team_id())
  WITH CHECK (team_id = public._rls_current_user_team_id());

-- JOB_REQUIREMENTS
CREATE POLICY job_requirements_master_admin_all ON job_requirements
  FOR ALL
  USING (public._rls_is_master_admin())
  WITH CHECK (public._rls_is_master_admin());

CREATE POLICY job_requirements_team_access ON job_requirements
  FOR ALL
  USING (team_id = public._rls_current_user_team_id())
  WITH CHECK (team_id = public._rls_current_user_team_id());

-- SUBMISSIONS
CREATE POLICY submissions_master_admin_all ON submissions
  FOR ALL
  USING (public._rls_is_master_admin())
  WITH CHECK (public._rls_is_master_admin());

CREATE POLICY submissions_team_access ON submissions
  FOR ALL
  USING (team_id = public._rls_current_user_team_id())
  WITH CHECK (team_id = public._rls_current_user_team_id());

-- INTERVIEWS
CREATE POLICY interviews_master_admin_all ON interviews
  FOR ALL
  USING (public._rls_is_master_admin())
  WITH CHECK (public._rls_is_master_admin());

CREATE POLICY interviews_team_access ON interviews
  FOR ALL
  USING (team_id = public._rls_current_user_team_id())
  WITH CHECK (team_id = public._rls_current_user_team_id());

-- PROJECTS
CREATE POLICY projects_master_admin_all ON projects
  FOR ALL
  USING (public._rls_is_master_admin())
  WITH CHECK (public._rls_is_master_admin());

CREATE POLICY projects_team_access ON projects
  FOR ALL
  USING (team_id = public._rls_current_user_team_id())
  WITH CHECK (team_id = public._rls_current_user_team_id());

-- TIMESHEETS
CREATE POLICY timesheets_master_admin_all ON timesheets
  FOR ALL
  USING (public._rls_is_master_admin())
  WITH CHECK (public._rls_is_master_admin());

CREATE POLICY timesheets_team_access ON timesheets
  FOR ALL
  USING (team_id = public._rls_current_user_team_id())
  WITH CHECK (team_id = public._rls_current_user_team_id());

-- INVOICES
CREATE POLICY invoices_master_admin_all ON invoices
  FOR ALL
  USING (public._rls_is_master_admin())
  WITH CHECK (public._rls_is_master_admin());

CREATE POLICY invoices_team_access ON invoices
  FOR ALL
  USING (team_id = public._rls_current_user_team_id())
  WITH CHECK (team_id = public._rls_current_user_team_id());

-- IMMIGRATION
CREATE POLICY immigration_master_admin_all ON immigration
  FOR ALL
  USING (public._rls_is_master_admin())
  WITH CHECK (public._rls_is_master_admin());

CREATE POLICY immigration_team_access ON immigration
  FOR ALL
  USING (team_id = public._rls_current_user_team_id())
  WITH CHECK (team_id = public._rls_current_user_team_id());

-- NOTES
CREATE POLICY notes_master_admin_all ON notes
  FOR ALL
  USING (public._rls_is_master_admin())
  WITH CHECK (public._rls_is_master_admin());

CREATE POLICY notes_team_access ON notes
  FOR ALL
  USING (team_id = public._rls_current_user_team_id())
  WITH CHECK (team_id = public._rls_current_user_team_id());

-- ============================================================================
-- VERIFICATION: All RLS tables are enabled
-- ============================================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
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
