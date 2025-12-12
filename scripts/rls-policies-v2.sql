-- ================================================================
-- ATS Row Level Security (RLS) Policies V2
-- Multi-tenant isolation using SECURITY DEFINER helper functions
-- Author: generated
-- Notes:
-- 1) This script creates SECURITY DEFINER helper functions to fetch
--    the current user's team_id and master-admin flag without triggering
--    RLS recursion.
-- 2) Run this script as a superuser or as the same owner of the
--    affected tables (commonly the database owner). The SECURITY DEFINER
--    functions should be owned by a role that bypasses RLS (table owner
--    or a dedicated admin role).
-- 3) After running, test policies using different accounts.
-- ================================================================

-- ================================================================
-- DROP EXISTING POLICIES (safely)
-- ================================================================

-- Removed DO block to avoid touching system tables like auth.users.
-- Explicit DROP POLICY statements below are sufficient and safest.

-- Remove named policies if they exist (explicitly, to avoid duplicates)
-- A conservative approach: drop by name where exists

-- (Dropping known policy names used previously)

DROP POLICY IF EXISTS teams_select_policy ON teams;
DROP POLICY IF EXISTS teams_insert_policy ON teams;
DROP POLICY IF EXISTS teams_update_policy ON teams;
DROP POLICY IF EXISTS teams_delete_policy ON teams;

DROP POLICY IF EXISTS roles_select_policy ON roles;
DROP POLICY IF EXISTS roles_insert_policy ON roles;
DROP POLICY IF EXISTS roles_update_policy ON roles;
DROP POLICY IF EXISTS roles_delete_policy ON roles;

DROP POLICY IF EXISTS role_permissions_select_policy ON role_permissions;
DROP POLICY IF EXISTS role_permissions_insert_policy ON role_permissions;
DROP POLICY IF EXISTS role_permissions_update_policy ON role_permissions;
DROP POLICY IF EXISTS role_permissions_delete_policy ON role_permissions;

DROP POLICY IF EXISTS users_select_policy ON users;
DROP POLICY IF EXISTS users_insert_policy ON users;
DROP POLICY IF EXISTS users_update_policy ON users;
DROP POLICY IF EXISTS users_delete_policy ON users;

DROP POLICY IF EXISTS candidates_select_policy ON candidates;
DROP POLICY IF EXISTS candidates_insert_policy ON candidates;
DROP POLICY IF EXISTS candidates_update_policy ON candidates;
DROP POLICY IF EXISTS candidates_delete_policy ON candidates;

DROP POLICY IF EXISTS vendors_select_policy ON vendors;
DROP POLICY IF EXISTS vendors_insert_policy ON vendors;
DROP POLICY IF EXISTS vendors_update_policy ON vendors;
DROP POLICY IF EXISTS vendors_delete_policy ON vendors;

DROP POLICY IF EXISTS clients_select_policy ON clients;
DROP POLICY IF EXISTS clients_insert_policy ON clients;
DROP POLICY IF EXISTS clients_update_policy ON clients;
DROP POLICY IF EXISTS clients_delete_policy ON clients;

DROP POLICY IF EXISTS job_requirements_select_policy ON job_requirements;
DROP POLICY IF EXISTS job_requirements_insert_policy ON job_requirements;
DROP POLICY IF EXISTS job_requirements_update_policy ON job_requirements;
DROP POLICY IF EXISTS job_requirements_delete_policy ON job_requirements;

DROP POLICY IF EXISTS submissions_select_policy ON submissions;
DROP POLICY IF EXISTS submissions_insert_policy ON submissions;
DROP POLICY IF EXISTS submissions_update_policy ON submissions;
DROP POLICY IF EXISTS submissions_delete_policy ON submissions;

DROP POLICY IF EXISTS interviews_select_policy ON interviews;
DROP POLICY IF EXISTS interviews_insert_policy ON interviews;
DROP POLICY IF EXISTS interviews_update_policy ON interviews;
DROP POLICY IF EXISTS interviews_delete_policy ON interviews;

DROP POLICY IF EXISTS projects_select_policy ON projects;
DROP POLICY IF EXISTS projects_insert_policy ON projects;
DROP POLICY IF EXISTS projects_update_policy ON projects;
DROP POLICY IF EXISTS projects_delete_policy ON projects;

DROP POLICY IF EXISTS timesheets_select_policy ON timesheets;
DROP POLICY IF EXISTS timesheets_insert_policy ON timesheets;
DROP POLICY IF EXISTS timesheets_update_policy ON timesheets;
DROP POLICY IF EXISTS timesheets_delete_policy ON timesheets;

DROP POLICY IF EXISTS invoices_select_policy ON invoices;
DROP POLICY IF EXISTS invoices_insert_policy ON invoices;
DROP POLICY IF EXISTS invoices_update_policy ON invoices;
DROP POLICY IF EXISTS invoices_delete_policy ON invoices;

DROP POLICY IF EXISTS immigration_select_policy ON immigration;
DROP POLICY IF EXISTS immigration_insert_policy ON immigration;
DROP POLICY IF EXISTS immigration_update_policy ON immigration;
DROP POLICY IF EXISTS immigration_delete_policy ON immigration;

DROP POLICY IF EXISTS notes_select_policy ON notes;
DROP POLICY IF EXISTS notes_insert_policy ON notes;
DROP POLICY IF EXISTS notes_update_policy ON notes;
DROP POLICY IF EXISTS notes_delete_policy ON notes;

DROP POLICY IF EXISTS activities_select_policy ON activities;
DROP POLICY IF EXISTS activities_insert_policy ON activities;

DROP POLICY IF EXISTS role_templates_select_policy ON role_templates;
DROP POLICY IF EXISTS role_templates_insert_policy ON role_templates;

DROP POLICY IF EXISTS permissions_select_policy ON permissions;
DROP POLICY IF EXISTS permissions_insert_policy ON permissions;

DROP POLICY IF EXISTS template_permissions_select_policy ON template_permissions;
DROP POLICY IF EXISTS template_permissions_insert_policy ON template_permissions;

-- ================================================================
-- SECURITY DEFINER HELPER FUNCTIONS (bypass RLS)
-- These read the users table WITHOUT RLS recursion when called inside policies
-- ================================================================

-- NOTE: adapt return types (text/uuid/int) to match your schema. Here we
-- assume user_id is text and team_id is text/uuid-compatible; change casts
-- as required.

CREATE OR REPLACE FUNCTION public._rls_current_user_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public._rls_current_user_team_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id::text FROM users WHERE user_id = auth.uid()::text LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public._rls_is_master_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_master_admin, false) FROM users WHERE user_id = auth.uid()::text LIMIT 1;
$$;

-- Grant execute to public (or to a narrower role if desired). Adjust as required.
GRANT EXECUTE ON FUNCTION public._rls_current_user_id() TO public;
GRANT EXECUTE ON FUNCTION public._rls_current_user_team_id() TO public;
GRANT EXECUTE ON FUNCTION public._rls_is_master_admin() TO public;

-- ================================================================
-- ENABLE RLS ON TABLES
-- ================================================================

ALTER TABLE IF EXISTS teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS job_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS immigration ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS template_permissions ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- TEAMS POLICIES
-- ================================================================

CREATE POLICY teams_select_policy ON teams
  FOR SELECT
  USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

CREATE POLICY teams_insert_policy ON teams
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR auth.uid() IS NULL  -- Allow service role (no user context during signup)
  );

CREATE POLICY teams_update_policy ON teams
  FOR UPDATE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

CREATE POLICY teams_delete_policy ON teams
  FOR DELETE USING (
    public._rls_is_master_admin()
  );

-- ================================================================
-- ROLES POLICIES
-- ================================================================

CREATE POLICY roles_select_policy ON roles
  FOR SELECT
  USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

CREATE POLICY roles_insert_policy ON roles
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

CREATE POLICY roles_update_policy ON roles
  FOR UPDATE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

CREATE POLICY roles_delete_policy ON roles
  FOR DELETE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

-- ================================================================
-- ROLE_PERMISSIONS POLICIES
-- We check the role's team against current user's team without querying users
-- ================================================================

CREATE POLICY role_permissions_select_policy ON role_permissions
  FOR SELECT
  USING (
    public._rls_is_master_admin()
    OR EXISTS (
      SELECT 1 FROM roles r WHERE r.role_id = role_permissions.role_id AND r.team_id::text = public._rls_current_user_team_id()
    )
  );

CREATE POLICY role_permissions_insert_policy ON role_permissions
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR EXISTS (
      SELECT 1 FROM roles r WHERE r.role_id = role_permissions.role_id AND r.team_id::text = public._rls_current_user_team_id()
    )
  );

CREATE POLICY role_permissions_update_policy ON role_permissions
  FOR UPDATE USING (
    public._rls_is_master_admin()
    OR EXISTS (
      SELECT 1 FROM roles r WHERE r.role_id = role_permissions.role_id AND r.team_id::text = public._rls_current_user_team_id()
    )
  );

CREATE POLICY role_permissions_delete_policy ON role_permissions
  FOR DELETE USING (
    public._rls_is_master_admin()
    OR EXISTS (
      SELECT 1 FROM roles r WHERE r.role_id = role_permissions.role_id AND r.team_id::text = public._rls_current_user_team_id()
    )
  );

-- ================================================================
-- USERS POLICIES (important: these used to recurse)
-- Use helper functions instead of querying users inside users' policies
-- ================================================================

CREATE POLICY users_select_policy ON users
  FOR SELECT
  USING (
    user_id::text = public._rls_current_user_id()
    OR public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

CREATE POLICY users_insert_policy ON users
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
    OR user_id::text = public._rls_current_user_id()  -- Allow users to create their own record (for signup)
    OR auth.uid() IS NULL  -- Allow service role (no user context during signup)
  );

CREATE POLICY users_update_policy ON users
  FOR UPDATE USING (
    user_id::text = public._rls_current_user_id()
    OR public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

CREATE POLICY users_delete_policy ON users
  FOR DELETE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

-- ================================================================
-- BUSINESS ENTITY POLICIES (candidates, vendors, clients, etc.)
-- Pattern: master admin OR team_id = current_user_team
-- ================================================================

-- Helper macro would be convenient; writing explicit policies for clarity

-- CANDIDATES
CREATE POLICY candidates_select_policy ON candidates
  FOR SELECT USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY candidates_insert_policy ON candidates
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY candidates_update_policy ON candidates
  FOR UPDATE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY candidates_delete_policy ON candidates
  FOR DELETE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

-- VENDORS
CREATE POLICY vendors_select_policy ON vendors
  FOR SELECT USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY vendors_insert_policy ON vendors
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY vendors_update_policy ON vendors
  FOR UPDATE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY vendors_delete_policy ON vendors
  FOR DELETE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

-- CLIENTS
CREATE POLICY clients_select_policy ON clients
  FOR SELECT USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY clients_insert_policy ON clients
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY clients_update_policy ON clients
  FOR UPDATE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY clients_delete_policy ON clients
  FOR DELETE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

-- JOB REQUIREMENTS
CREATE POLICY job_requirements_select_policy ON job_requirements
  FOR SELECT USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY job_requirements_insert_policy ON job_requirements
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY job_requirements_update_policy ON job_requirements
  FOR UPDATE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY job_requirements_delete_policy ON job_requirements
  FOR DELETE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

-- SUBMISSIONS
CREATE POLICY submissions_select_policy ON submissions
  FOR SELECT USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY submissions_insert_policy ON submissions
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY submissions_update_policy ON submissions
  FOR UPDATE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY submissions_delete_policy ON submissions
  FOR DELETE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

-- INTERVIEWS
CREATE POLICY interviews_select_policy ON interviews
  FOR SELECT USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY interviews_insert_policy ON interviews
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY interviews_update_policy ON interviews
  FOR UPDATE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY interviews_delete_policy ON interviews
  FOR DELETE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

-- PROJECTS
CREATE POLICY projects_select_policy ON projects
  FOR SELECT USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY projects_insert_policy ON projects
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY projects_update_policy ON projects
  FOR UPDATE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY projects_delete_policy ON projects
  FOR DELETE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

-- TIMESHEETS
CREATE POLICY timesheets_select_policy ON timesheets
  FOR SELECT USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY timesheets_insert_policy ON timesheets
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY timesheets_update_policy ON timesheets
  FOR UPDATE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY timesheets_delete_policy ON timesheets
  FOR DELETE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

-- INVOICES
CREATE POLICY invoices_select_policy ON invoices
  FOR SELECT USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY invoices_insert_policy ON invoices
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY invoices_update_policy ON invoices
  FOR UPDATE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY invoices_delete_policy ON invoices
  FOR DELETE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

-- IMMIGRATION
CREATE POLICY immigration_select_policy ON immigration
  FOR SELECT USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY immigration_insert_policy ON immigration
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY immigration_update_policy ON immigration
  FOR UPDATE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY immigration_delete_policy ON immigration
  FOR DELETE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

-- NOTES
CREATE POLICY notes_select_policy ON notes
  FOR SELECT USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY notes_insert_policy ON notes
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY notes_update_policy ON notes
  FOR UPDATE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY notes_delete_policy ON notes
  FOR DELETE USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );

-- ACTIVITIES (append-only audit)
CREATE POLICY activities_select_policy ON activities
  FOR SELECT USING (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
CREATE POLICY activities_insert_policy ON activities
  FOR INSERT WITH CHECK (
    public._rls_is_master_admin()
    OR team_id::text = public._rls_current_user_team_id()
  );
-- No UPDATE/DELETE policies: append-only

-- ROLE TEMPLATES / PERMISSIONS / TEMPLATE_PERMISSIONS
-- Readable by any authenticated user; modification limited to master admins
CREATE POLICY role_templates_select_policy ON role_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY permissions_select_policy ON permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY template_permissions_select_policy ON template_permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY role_templates_insert_policy ON role_templates
  FOR INSERT WITH CHECK (public._rls_is_master_admin());
CREATE POLICY permissions_insert_policy ON permissions
  FOR INSERT WITH CHECK (public._rls_is_master_admin());
CREATE POLICY template_permissions_insert_policy ON template_permissions
  FOR INSERT WITH CHECK (public._rls_is_master_admin());

-- ================================================================
-- FINISH: re-enable RLS enforcement explicitly (already enabled above)
-- ================================================================

-- Optionally verify policies -- provide recommended manual checks:
-- 1) Verify helper functions are owned by an RLS-bypassing role (owner should be db owner)
-- 2) Test SELECT/INSERT/UPDATE/DELETE with a master admin user and a regular user from another team
-- 3) If using Supabase, ensure auth.uid() returns the expected user_id and types match

-- End of file
