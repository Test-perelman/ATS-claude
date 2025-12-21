-- ============================================================================
-- CLEANUP: Remove ALL existing RLS policies and functions
-- Run this FIRST before running the main fix migration
-- ============================================================================

-- Step 1: Disable RLS on all tables to allow deletion without policy conflicts
ALTER TABLE IF EXISTS teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS job_requirements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS interviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS timesheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS immigration DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notes DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all policies by name
DROP POLICY IF EXISTS users_master_admin ON users;
DROP POLICY IF EXISTS users_own_team ON users;
DROP POLICY IF EXISTS users_own_profile ON users;
DROP POLICY IF EXISTS users_select_policy ON users;
DROP POLICY IF EXISTS users_insert_policy ON users;
DROP POLICY IF EXISTS users_update_policy ON users;
DROP POLICY IF EXISTS users_delete_policy ON users;
DROP POLICY IF EXISTS users_master_admin_all ON users;
DROP POLICY IF EXISTS users_read_self ON users;
DROP POLICY IF EXISTS users_update_self ON users;
DROP POLICY IF EXISTS users_insert_on_signup ON users;
DROP POLICY IF EXISTS users_read_team ON users;

DROP POLICY IF EXISTS teams_master_admin ON teams;
DROP POLICY IF EXISTS teams_own_team ON teams;
DROP POLICY IF EXISTS teams_select_policy ON teams;
DROP POLICY IF EXISTS teams_insert_policy ON teams;
DROP POLICY IF EXISTS teams_update_policy ON teams;
DROP POLICY IF EXISTS teams_delete_policy ON teams;
DROP POLICY IF EXISTS teams_master_admin_all ON teams;
DROP POLICY IF EXISTS teams_read_own ON teams;

DROP POLICY IF EXISTS roles_master_admin ON roles;
DROP POLICY IF EXISTS roles_own_team ON roles;
DROP POLICY IF EXISTS roles_select_policy ON roles;
DROP POLICY IF EXISTS roles_insert_policy ON roles;
DROP POLICY IF EXISTS roles_update_policy ON roles;
DROP POLICY IF EXISTS roles_delete_policy ON roles;
DROP POLICY IF EXISTS roles_master_admin_all ON roles;
DROP POLICY IF EXISTS roles_team_access ON roles;

DROP POLICY IF EXISTS role_permissions_master_admin ON role_permissions;
DROP POLICY IF EXISTS role_permissions_own_team ON role_permissions;
DROP POLICY IF EXISTS role_permissions_select_policy ON role_permissions;
DROP POLICY IF EXISTS role_permissions_insert_policy ON role_permissions;
DROP POLICY IF EXISTS role_permissions_update_policy ON role_permissions;
DROP POLICY IF EXISTS role_permissions_delete_policy ON role_permissions;
DROP POLICY IF EXISTS role_permissions_master_admin_all ON role_permissions;

DROP POLICY IF EXISTS permissions_read ON permissions;
DROP POLICY IF EXISTS permissions_select_policy ON permissions;
DROP POLICY IF EXISTS permissions_insert_policy ON permissions;

DROP POLICY IF EXISTS candidates_master_admin ON candidates;
DROP POLICY IF EXISTS candidates_own_team ON candidates;
DROP POLICY IF EXISTS candidates_select_policy ON candidates;
DROP POLICY IF EXISTS candidates_insert_policy ON candidates;
DROP POLICY IF EXISTS candidates_update_policy ON candidates;
DROP POLICY IF EXISTS candidates_delete_policy ON candidates;
DROP POLICY IF EXISTS candidates_master_admin_all ON candidates;
DROP POLICY IF EXISTS candidates_team_access ON candidates;

DROP POLICY IF EXISTS vendors_master_admin ON vendors;
DROP POLICY IF EXISTS vendors_own_team ON vendors;
DROP POLICY IF EXISTS vendors_select_policy ON vendors;
DROP POLICY IF EXISTS vendors_insert_policy ON vendors;
DROP POLICY IF EXISTS vendors_update_policy ON vendors;
DROP POLICY IF EXISTS vendors_delete_policy ON vendors;
DROP POLICY IF EXISTS vendors_master_admin_all ON vendors;
DROP POLICY IF EXISTS vendors_team_access ON vendors;

DROP POLICY IF EXISTS clients_master_admin ON clients;
DROP POLICY IF EXISTS clients_own_team ON clients;
DROP POLICY IF EXISTS clients_select_policy ON clients;
DROP POLICY IF EXISTS clients_insert_policy ON clients;
DROP POLICY IF EXISTS clients_update_policy ON clients;
DROP POLICY IF EXISTS clients_delete_policy ON clients;
DROP POLICY IF EXISTS clients_master_admin_all ON clients;
DROP POLICY IF EXISTS clients_team_access ON clients;

DROP POLICY IF EXISTS job_requirements_master_admin ON job_requirements;
DROP POLICY IF EXISTS job_requirements_own_team ON job_requirements;
DROP POLICY IF EXISTS job_requirements_select_policy ON job_requirements;
DROP POLICY IF EXISTS job_requirements_insert_policy ON job_requirements;
DROP POLICY IF EXISTS job_requirements_update_policy ON job_requirements;
DROP POLICY IF EXISTS job_requirements_delete_policy ON job_requirements;
DROP POLICY IF EXISTS job_requirements_master_admin_all ON job_requirements;
DROP POLICY IF EXISTS job_requirements_team_access ON job_requirements;

DROP POLICY IF EXISTS submissions_master_admin ON submissions;
DROP POLICY IF EXISTS submissions_own_team ON submissions;
DROP POLICY IF EXISTS submissions_select_policy ON submissions;
DROP POLICY IF EXISTS submissions_insert_policy ON submissions;
DROP POLICY IF EXISTS submissions_update_policy ON submissions;
DROP POLICY IF EXISTS submissions_delete_policy ON submissions;
DROP POLICY IF EXISTS submissions_master_admin_all ON submissions;
DROP POLICY IF EXISTS submissions_team_access ON submissions;

DROP POLICY IF EXISTS interviews_master_admin ON interviews;
DROP POLICY IF EXISTS interviews_own_team ON interviews;
DROP POLICY IF EXISTS interviews_select_policy ON interviews;
DROP POLICY IF EXISTS interviews_insert_policy ON interviews;
DROP POLICY IF EXISTS interviews_update_policy ON interviews;
DROP POLICY IF EXISTS interviews_delete_policy ON interviews;
DROP POLICY IF EXISTS interviews_master_admin_all ON interviews;
DROP POLICY IF EXISTS interviews_team_access ON interviews;

DROP POLICY IF EXISTS projects_master_admin ON projects;
DROP POLICY IF EXISTS projects_own_team ON projects;
DROP POLICY IF EXISTS projects_select_policy ON projects;
DROP POLICY IF EXISTS projects_insert_policy ON projects;
DROP POLICY IF EXISTS projects_update_policy ON projects;
DROP POLICY IF EXISTS projects_delete_policy ON projects;
DROP POLICY IF EXISTS projects_master_admin_all ON projects;
DROP POLICY IF EXISTS projects_team_access ON projects;

DROP POLICY IF EXISTS timesheets_master_admin ON timesheets;
DROP POLICY IF EXISTS timesheets_own_team ON timesheets;
DROP POLICY IF EXISTS timesheets_select_policy ON timesheets;
DROP POLICY IF EXISTS timesheets_insert_policy ON timesheets;
DROP POLICY IF EXISTS timesheets_update_policy ON timesheets;
DROP POLICY IF EXISTS timesheets_delete_policy ON timesheets;
DROP POLICY IF EXISTS timesheets_master_admin_all ON timesheets;
DROP POLICY IF EXISTS timesheets_team_access ON timesheets;

DROP POLICY IF EXISTS invoices_master_admin ON invoices;
DROP POLICY IF EXISTS invoices_own_team ON invoices;
DROP POLICY IF EXISTS invoices_select_policy ON invoices;
DROP POLICY IF EXISTS invoices_insert_policy ON invoices;
DROP POLICY IF EXISTS invoices_update_policy ON invoices;
DROP POLICY IF EXISTS invoices_delete_policy ON invoices;
DROP POLICY IF EXISTS invoices_master_admin_all ON invoices;
DROP POLICY IF EXISTS invoices_team_access ON invoices;

DROP POLICY IF EXISTS immigration_master_admin ON immigration;
DROP POLICY IF EXISTS immigration_own_team ON immigration;
DROP POLICY IF EXISTS immigration_select_policy ON immigration;
DROP POLICY IF EXISTS immigration_insert_policy ON immigration;
DROP POLICY IF EXISTS immigration_update_policy ON immigration;
DROP POLICY IF EXISTS immigration_delete_policy ON immigration;
DROP POLICY IF EXISTS immigration_master_admin_all ON immigration;
DROP POLICY IF EXISTS immigration_team_access ON immigration;

DROP POLICY IF EXISTS notes_master_admin ON notes;
DROP POLICY IF EXISTS notes_own_team ON notes;
DROP POLICY IF EXISTS notes_select_policy ON notes;
DROP POLICY IF EXISTS notes_insert_policy ON notes;
DROP POLICY IF EXISTS notes_update_policy ON notes;
DROP POLICY IF EXISTS notes_delete_policy ON notes;
DROP POLICY IF EXISTS notes_master_admin_all ON notes;
DROP POLICY IF EXISTS notes_team_access ON notes;

-- Step 3: Drop all broken helper functions (use CASCADE to drop dependent objects)
DROP FUNCTION IF EXISTS public._rls_current_user_id() CASCADE;
DROP FUNCTION IF EXISTS public._rls_current_user_team_id() CASCADE;
DROP FUNCTION IF EXISTS public._rls_is_master_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_master_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_team_id(TEXT) CASCADE;

-- Step 4: Revoke grants from authenticated role
REVOKE ALL ON public.users FROM authenticated CASCADE;
REVOKE ALL ON public.teams FROM authenticated CASCADE;
REVOKE ALL ON public.roles FROM authenticated CASCADE;
REVOKE ALL ON public.role_permissions FROM authenticated CASCADE;
REVOKE ALL ON public.permissions FROM authenticated CASCADE;
REVOKE ALL ON public.candidates FROM authenticated CASCADE;
REVOKE ALL ON public.vendors FROM authenticated CASCADE;
REVOKE ALL ON public.clients FROM authenticated CASCADE;
REVOKE ALL ON public.job_requirements FROM authenticated CASCADE;
REVOKE ALL ON public.submissions FROM authenticated CASCADE;
REVOKE ALL ON public.interviews FROM authenticated CASCADE;
REVOKE ALL ON public.projects FROM authenticated CASCADE;
REVOKE ALL ON public.timesheets FROM authenticated CASCADE;
REVOKE ALL ON public.invoices FROM authenticated CASCADE;
REVOKE ALL ON public.immigration FROM authenticated CASCADE;
REVOKE ALL ON public.notes FROM authenticated CASCADE;

-- Step 5: Revoke grants from anon role
REVOKE ALL ON public.users FROM anon CASCADE;
REVOKE ALL ON public.teams FROM anon CASCADE;
REVOKE ALL ON public.roles FROM anon CASCADE;
REVOKE ALL ON public.role_permissions FROM anon CASCADE;
REVOKE ALL ON public.permissions FROM anon CASCADE;
REVOKE ALL ON public.candidates FROM anon CASCADE;
REVOKE ALL ON public.vendors FROM anon CASCADE;
REVOKE ALL ON public.clients FROM anon CASCADE;
REVOKE ALL ON public.job_requirements FROM anon CASCADE;
REVOKE ALL ON public.submissions FROM anon CASCADE;
REVOKE ALL ON public.interviews FROM anon CASCADE;
REVOKE ALL ON public.projects FROM anon CASCADE;
REVOKE ALL ON public.timesheets FROM anon CASCADE;
REVOKE ALL ON public.invoices FROM anon CASCADE;
REVOKE ALL ON public.immigration FROM anon CASCADE;
REVOKE ALL ON public.notes FROM anon CASCADE;

-- Done - database is now clean and ready for fresh RLS setup
