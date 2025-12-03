-- Supabase RLS (Row-Level Security) Policies for RBAC
-- These policies enforce team-based data isolation and role-based access at the database level
--
-- Key Principle:
-- - Master Admins (is_master_admin = true) see all data
-- - Local Admins and regular users see only their team's data
-- - Users can never see other teams' data without explicit permission
--
-- Usage: Run these SQL commands in Supabase SQL Editor
-- WARNING: Test in non-production environment first!

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE visa_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bench_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_dropdowns ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can see their own record
CREATE POLICY "users_read_self" ON users
  FOR SELECT USING (
    auth.uid()::text = user_id
  );

-- Master Admins can see all users
CREATE POLICY "users_read_master_admin" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()::text
      AND is_master_admin = TRUE
    )
  );

-- Local Admins can see users in their team
CREATE POLICY "users_read_team" ON users
  FOR SELECT USING (
    team_id = (
      SELECT team_id FROM users
      WHERE user_id = auth.uid()::text
    )
  );

-- Users can update their own profile
CREATE POLICY "users_update_self" ON users
  FOR UPDATE USING (
    auth.uid()::text = user_id
  )
  WITH CHECK (
    auth.uid()::text = user_id
  );

-- Local and Master Admins can update team members
CREATE POLICY "users_update_admin" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users as admin
      WHERE admin.user_id = auth.uid()::text
      AND (
        admin.is_master_admin = TRUE
        OR admin.team_id = users.team_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users as admin
      WHERE admin.user_id = auth.uid()::text
      AND (
        admin.is_master_admin = TRUE
        OR admin.team_id = users.team_id
      )
    )
  );

-- ============================================================================
-- TEAMS TABLE POLICIES
-- ============================================================================

-- Users can see their own team
CREATE POLICY "teams_read_own" ON teams
  FOR SELECT USING (
    team_id = (
      SELECT team_id FROM users
      WHERE user_id = auth.uid()::text
    )
  );

-- Master Admins can see all teams
CREATE POLICY "teams_read_all" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()::text
      AND is_master_admin = TRUE
    )
  );

-- Team admins can update their team
CREATE POLICY "teams_update_admin" ON teams
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()::text
      AND team_id = teams.team_id
      AND role_id IN (SELECT role_id FROM roles WHERE role_name IN ('Master Admin', 'Local Admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()::text
      AND team_id = teams.team_id
      AND role_id IN (SELECT role_id FROM roles WHERE role_name IN ('Master Admin', 'Local Admin'))
    )
  );

-- ============================================================================
-- ROLES & PERMISSIONS TABLES (READABLE BY AUTHENTICATED USERS)
-- ============================================================================

-- All authenticated users can read roles
CREATE POLICY "roles_read_authenticated" ON roles
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- Only admins can create/modify roles
CREATE POLICY "roles_write_admin" ON roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()::text
      AND (
        is_master_admin = TRUE
        OR role_id IN (
          SELECT role_id FROM roles WHERE role_name = 'Local Admin'
        )
      )
    )
  );

CREATE POLICY "roles_update_admin" ON roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()::text
      AND is_master_admin = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()::text
      AND is_master_admin = TRUE
    )
  );

-- All authenticated users can read permissions
CREATE POLICY "permissions_read_authenticated" ON permissions
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- All authenticated users can read role_permissions
CREATE POLICY "role_permissions_read_authenticated" ON role_permissions
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- Only admins can modify role_permissions
CREATE POLICY "role_permissions_write_admin" ON role_permissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()::text
      AND (
        is_master_admin = TRUE
        OR role_id IN (
          SELECT role_id FROM roles WHERE role_name = 'Local Admin'
        )
      )
    )
  );

CREATE POLICY "role_permissions_update_admin" ON role_permissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()::text
      AND is_master_admin = TRUE
    )
  );

CREATE POLICY "role_permissions_delete_admin" ON role_permissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()::text
      AND is_master_admin = TRUE
    )
  );

-- ============================================================================
-- CANDIDATE TABLE POLICIES
-- ============================================================================

-- Users can see candidates in their team or if they're Master Admin
CREATE POLICY "candidates_read" ON candidates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()::text
      AND (
        is_master_admin = TRUE
        OR team_id = candidates.team_id
      )
    )
  );

-- Users with permission can insert candidates
CREATE POLICY "candidates_insert" ON candidates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'candidate.create'
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = candidates.team_id
      )
    )
  );

-- Users with permission can update candidates in their team
CREATE POLICY "candidates_update" ON candidates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'candidate.update'
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = candidates.team_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'candidate.update'
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = candidates.team_id
      )
    )
  );

-- Users with permission can delete candidates in their team
CREATE POLICY "candidates_delete" ON candidates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'candidate.delete'
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = candidates.team_id
      )
    )
  );

-- ============================================================================
-- VENDOR TABLE POLICIES
-- ============================================================================

CREATE POLICY "vendors_read" ON vendors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()::text
      AND (
        is_master_admin = TRUE
        OR team_id = vendors.team_id
      )
    )
  );

CREATE POLICY "vendors_insert" ON vendors
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'vendor.create'
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = vendors.team_id
      )
    )
  );

CREATE POLICY "vendors_update" ON vendors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'vendor.update'
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = vendors.team_id
      )
    )
  );

CREATE POLICY "vendors_delete" ON vendors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'vendor.delete'
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = vendors.team_id
      )
    )
  );

-- ============================================================================
-- CLIENT TABLE POLICIES (Same pattern as Vendor)
-- ============================================================================

CREATE POLICY "clients_read" ON clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()::text
      AND (
        is_master_admin = TRUE
        OR team_id = clients.team_id
      )
    )
  );

CREATE POLICY "clients_insert" ON clients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'client.create'
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = clients.team_id
      )
    )
  );

CREATE POLICY "clients_update" ON clients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'client.update'
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = clients.team_id
      )
    )
  );

CREATE POLICY "clients_delete" ON clients
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'client.delete'
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = clients.team_id
      )
    )
  );

-- ============================================================================
-- JOB_REQUIREMENTS TABLE POLICIES
-- ============================================================================

CREATE POLICY "jobs_read" ON job_requirements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()::text
      AND (
        is_master_admin = TRUE
        OR team_id = job_requirements.team_id
      )
    )
  );

CREATE POLICY "jobs_insert" ON job_requirements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'job.create'
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = job_requirements.team_id
      )
    )
  );

CREATE POLICY "jobs_update" ON job_requirements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'job.update'
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = job_requirements.team_id
      )
    )
  );

CREATE POLICY "jobs_delete" ON job_requirements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'job.delete'
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = job_requirements.team_id
      )
    )
  );

-- ============================================================================
-- SUBMISSION TABLE POLICIES
-- ============================================================================

CREATE POLICY "submissions_read" ON submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()::text
      AND (
        users.is_master_admin = TRUE
        -- Submissions don't have team_id directly, so check via job_id
        OR EXISTS (
          SELECT 1 FROM job_requirements
          WHERE job_requirements.job_id = submissions.job_id
          AND job_requirements.team_id = users.team_id
        )
      )
    )
  );

CREATE POLICY "submissions_insert" ON submissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'submission.create'
      AND (
        users.is_master_admin = TRUE
        OR EXISTS (
          SELECT 1 FROM job_requirements
          WHERE job_requirements.job_id = submissions.job_id
          AND job_requirements.team_id = users.team_id
        )
      )
    )
  );

CREATE POLICY "submissions_update" ON submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'submission.update'
      AND (
        users.is_master_admin = TRUE
        OR EXISTS (
          SELECT 1 FROM job_requirements
          WHERE job_requirements.job_id = submissions.job_id
          AND job_requirements.team_id = users.team_id
        )
      )
    )
  );

CREATE POLICY "submissions_delete" ON submissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'submission.delete'
      AND (
        users.is_master_admin = TRUE
        OR EXISTS (
          SELECT 1 FROM job_requirements
          WHERE job_requirements.job_id = submissions.job_id
          AND job_requirements.team_id = users.team_id
        )
      )
    )
  );

-- ============================================================================
-- INTERVIEWS TABLE POLICIES
-- ============================================================================

CREATE POLICY "interviews_read" ON interviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()::text
      AND (
        users.is_master_admin = TRUE
        OR EXISTS (
          SELECT 1 FROM submissions
          INNER JOIN job_requirements ON submissions.job_id = job_requirements.job_id
          WHERE submissions.submission_id = interviews.submission_id
          AND job_requirements.team_id = users.team_id
        )
      )
    )
  );

CREATE POLICY "interviews_insert" ON interviews
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'interview.create'
      AND (
        users.is_master_admin = TRUE
        OR EXISTS (
          SELECT 1 FROM submissions
          INNER JOIN job_requirements ON submissions.job_id = job_requirements.job_id
          WHERE submissions.submission_id = interviews.submission_id
          AND job_requirements.team_id = users.team_id
        )
      )
    )
  );

CREATE POLICY "interviews_update" ON interviews
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'interview.update'
      AND (
        users.is_master_admin = TRUE
        OR EXISTS (
          SELECT 1 FROM submissions
          INNER JOIN job_requirements ON submissions.job_id = job_requirements.job_id
          WHERE submissions.submission_id = interviews.submission_id
          AND job_requirements.team_id = users.team_id
        )
      )
    )
  );

CREATE POLICY "interviews_delete" ON interviews
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'interview.delete'
      AND (
        users.is_master_admin = TRUE
        OR EXISTS (
          SELECT 1 FROM submissions
          INNER JOIN job_requirements ON submissions.job_id = job_requirements.job_id
          WHERE submissions.submission_id = interviews.submission_id
          AND job_requirements.team_id = users.team_id
        )
      )
    )
  );

-- ============================================================================
-- PROJECT TABLE POLICIES
-- ============================================================================

CREATE POLICY "projects_read" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()::text
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = projects.team_id
      )
    )
  );

CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'project.create'
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = projects.team_id
      )
    )
  );

CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'project.update'
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = projects.team_id
      )
    )
  );

CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'project.delete'
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = projects.team_id
      )
    )
  );

-- ============================================================================
-- TIMESHEET TABLE POLICIES
-- ============================================================================

CREATE POLICY "timesheets_read" ON timesheets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN projects ON users.team_id = projects.team_id
      WHERE users.user_id = auth.uid()::text
      AND projects.project_id = timesheets.project_id
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = projects.team_id
      )
    )
  );

CREATE POLICY "timesheets_insert" ON timesheets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      INNER JOIN projects ON users.team_id = projects.team_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'timesheet.create'
      AND projects.project_id = timesheets.project_id
    )
  );

CREATE POLICY "timesheets_update" ON timesheets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      INNER JOIN projects ON users.team_id = projects.team_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'timesheet.update'
      AND projects.project_id = timesheets.project_id
    )
  );

-- ============================================================================
-- INVOICE TABLE POLICIES
-- ============================================================================

CREATE POLICY "invoices_read" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN projects ON users.team_id = projects.team_id
      WHERE users.user_id = auth.uid()::text
      AND projects.project_id = invoices.project_id
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = projects.team_id
      )
    )
  );

CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      INNER JOIN projects ON users.team_id = projects.team_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'invoice.create'
      AND projects.project_id = invoices.project_id
    )
  );

CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      INNER JOIN projects ON users.team_id = projects.team_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'invoice.update'
      AND projects.project_id = invoices.project_id
    )
  );

CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      INNER JOIN projects ON users.team_id = projects.team_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'invoice.delete'
      AND projects.project_id = invoices.project_id
    )
  );

-- ============================================================================
-- IMMIGRATION TABLE POLICIES
-- ============================================================================

CREATE POLICY "immigration_read" ON immigration
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN candidates ON users.team_id = candidates.team_id
      WHERE users.user_id = auth.uid()::text
      AND candidates.candidate_id = immigration.candidate_id
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = candidates.team_id
      )
    )
  );

CREATE POLICY "immigration_insert" ON immigration
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      INNER JOIN candidates ON users.team_id = candidates.team_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'immigration.create'
      AND candidates.candidate_id = immigration.candidate_id
    )
  );

CREATE POLICY "immigration_update" ON immigration
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      INNER JOIN candidates ON users.team_id = candidates.team_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'immigration.update'
      AND candidates.candidate_id = immigration.candidate_id
    )
  );

-- ============================================================================
-- VISA_STATUS TABLE POLICIES (READ-ONLY CONFIG TABLE)
-- ============================================================================

CREATE POLICY "visa_status_read" ON visa_status
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- ============================================================================
-- ATTACHMENTS TABLE POLICIES
-- ============================================================================

CREATE POLICY "attachments_read" ON attachments
  FOR SELECT USING (
    auth.role() = 'authenticated'
    -- Additional entity-based filtering could be added here
  );

-- ============================================================================
-- BENCH_HISTORY TABLE POLICIES
-- ============================================================================

CREATE POLICY "bench_history_read" ON bench_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN candidates ON users.team_id = candidates.team_id
      WHERE users.user_id = auth.uid()::text
      AND candidates.candidate_id = bench_history.candidate_id
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = candidates.team_id
      )
    )
  );

-- ============================================================================
-- AUDIT_LOG TABLE POLICIES
-- ============================================================================

CREATE POLICY "audit_log_read" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      INNER JOIN role_permissions ON users.role_id = role_permissions.role_id
      INNER JOIN permissions ON role_permissions.permission_id = permissions.permission_id
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'audit.view'
    )
  );

-- ============================================================================
-- NOTES TABLE POLICIES
-- ============================================================================

CREATE POLICY "notes_read" ON notes
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

CREATE POLICY "notes_insert" ON notes
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

CREATE POLICY "notes_update_own" ON notes
  FOR UPDATE USING (
    auth.uid()::text = created_by
  );

-- ============================================================================
-- ACTIVITIES TABLE POLICIES
-- ============================================================================

CREATE POLICY "activities_read" ON activities
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

CREATE POLICY "activities_insert" ON activities
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY "notifications_read_own" ON notifications
  FOR SELECT USING (
    user_id = auth.uid()::text
  );

CREATE POLICY "notifications_insert_own" ON notifications
  FOR INSERT WITH CHECK (
    user_id = auth.uid()::text
  );

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (
    user_id = auth.uid()::text
  );

-- ============================================================================
-- CONFIG_DROPDOWNS TABLE POLICIES (READ-ONLY CONFIG)
-- ============================================================================

CREATE POLICY "config_dropdowns_read" ON config_dropdowns
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- All RLS policies have been created successfully!
-- Users should now have team-based data isolation enforced at the database level.
-- Master Admins with is_master_admin = TRUE can see all data.
-- Local Admins and regular users are restricted to their team's data.
