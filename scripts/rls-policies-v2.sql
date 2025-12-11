-- ================================================================
-- ATS Row Level Security (RLS) Policies V2
-- Simplified, consistent pattern for multi-tenant isolation
-- ================================================================
--
-- POLICY PATTERN:
-- - Master admins (is_master_admin = true) can see/edit ALL data
-- - Regular users can only see/edit data from THEIR team
-- - Policies are simple and performant
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- TEAMS POLICIES
-- ================================================================

-- Master admin sees all teams, regular users see only their team
CREATE POLICY "teams_select_policy" ON teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- Only master admins can create teams (regular team creation happens via team signup)
CREATE POLICY "teams_insert_policy" ON teams
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
    );

-- Users can update their own team, master admin can update any
CREATE POLICY "teams_update_policy" ON teams
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- Only master admin can delete teams
CREATE POLICY "teams_delete_policy" ON teams
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
    );

-- ================================================================
-- ROLES POLICIES
-- ================================================================

-- Users can see roles in their team, master admin sees all
CREATE POLICY "roles_select_policy" ON roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- Only insert into user's team
CREATE POLICY "roles_insert_policy" ON roles
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT
                CASE
                    WHEN is_master_admin THEN roles.team_id
                    ELSE users.team_id
                END
            FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- Can update roles in their team
CREATE POLICY "roles_update_policy" ON roles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- Can delete roles in their team
CREATE POLICY "roles_delete_policy" ON roles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- ================================================================
-- ROLE PERMISSIONS POLICIES
-- ================================================================

-- Users can see role permissions for roles in their team
CREATE POLICY "role_permissions_select_policy" ON role_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        role_id IN (
            SELECT r.role_id FROM roles r
            INNER JOIN users u ON r.team_id = u.team_id
            WHERE u.user_id = auth.uid()::text
        )
    );

-- Can insert permissions for roles in their team
CREATE POLICY "role_permissions_insert_policy" ON role_permissions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        role_id IN (
            SELECT r.role_id FROM roles r
            INNER JOIN users u ON r.team_id = u.team_id
            WHERE u.user_id = auth.uid()::text
        )
    );

-- Can update permissions for roles in their team
CREATE POLICY "role_permissions_update_policy" ON role_permissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        role_id IN (
            SELECT r.role_id FROM roles r
            INNER JOIN users u ON r.team_id = u.team_id
            WHERE u.user_id = auth.uid()::text
        )
    );

-- Can delete permissions for roles in their team
CREATE POLICY "role_permissions_delete_policy" ON role_permissions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        role_id IN (
            SELECT r.role_id FROM roles r
            INNER JOIN users u ON r.team_id = u.team_id
            WHERE u.user_id = auth.uid()::text
        )
    );

-- ================================================================
-- USERS POLICIES
-- ================================================================

-- Master admin sees all users, regular users see their team members
CREATE POLICY "users_select_policy" ON users
    FOR SELECT USING (
        users.user_id = auth.uid()::text
        OR
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.user_id = auth.uid()::text
            AND u.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- Can insert users into their team (or any team if master admin)
CREATE POLICY "users_insert_policy" ON users
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT
                CASE
                    WHEN is_master_admin THEN users.team_id
                    ELSE u.team_id
                END
            FROM users u
            WHERE u.user_id = auth.uid()::text
        )
        OR
        (team_id IS NULL AND is_master_admin = true AND EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        ))
    );

-- Can update users in their team, or themselves
CREATE POLICY "users_update_policy" ON users
    FOR UPDATE USING (
        users.user_id = auth.uid()::text
        OR
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.user_id = auth.uid()::text
            AND u.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- Can delete users in their team
CREATE POLICY "users_delete_policy" ON users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.user_id = auth.uid()::text
            AND u.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- ================================================================
-- BUSINESS ENTITY POLICIES
-- Pattern: Master admin sees all, regular users see their team only
-- ================================================================

-- CANDIDATES
CREATE POLICY "candidates_select_policy" ON candidates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "candidates_insert_policy" ON candidates
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT
                CASE
                    WHEN is_master_admin THEN candidates.team_id
                    ELSE users.team_id
                END
            FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "candidates_update_policy" ON candidates
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "candidates_delete_policy" ON candidates
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- VENDORS
CREATE POLICY "vendors_select_policy" ON vendors
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "vendors_insert_policy" ON vendors
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT
                CASE
                    WHEN is_master_admin THEN vendors.team_id
                    ELSE users.team_id
                END
            FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "vendors_update_policy" ON vendors
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "vendors_delete_policy" ON vendors
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- CLIENTS
CREATE POLICY "clients_select_policy" ON clients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "clients_insert_policy" ON clients
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT
                CASE
                    WHEN is_master_admin THEN clients.team_id
                    ELSE users.team_id
                END
            FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "clients_update_policy" ON clients
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "clients_delete_policy" ON clients
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- JOB REQUIREMENTS
CREATE POLICY "job_requirements_select_policy" ON job_requirements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "job_requirements_insert_policy" ON job_requirements
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT
                CASE
                    WHEN is_master_admin THEN job_requirements.team_id
                    ELSE users.team_id
                END
            FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "job_requirements_update_policy" ON job_requirements
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "job_requirements_delete_policy" ON job_requirements
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- SUBMISSIONS
CREATE POLICY "submissions_select_policy" ON submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "submissions_insert_policy" ON submissions
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT
                CASE
                    WHEN is_master_admin THEN submissions.team_id
                    ELSE users.team_id
                END
            FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "submissions_update_policy" ON submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "submissions_delete_policy" ON submissions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- INTERVIEWS
CREATE POLICY "interviews_select_policy" ON interviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "interviews_insert_policy" ON interviews
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT
                CASE
                    WHEN is_master_admin THEN interviews.team_id
                    ELSE users.team_id
                END
            FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "interviews_update_policy" ON interviews
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "interviews_delete_policy" ON interviews
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- PROJECTS
CREATE POLICY "projects_select_policy" ON projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "projects_insert_policy" ON projects
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT
                CASE
                    WHEN is_master_admin THEN projects.team_id
                    ELSE users.team_id
                END
            FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "projects_update_policy" ON projects
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "projects_delete_policy" ON projects
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- TIMESHEETS
CREATE POLICY "timesheets_select_policy" ON timesheets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "timesheets_insert_policy" ON timesheets
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT
                CASE
                    WHEN is_master_admin THEN timesheets.team_id
                    ELSE users.team_id
                END
            FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "timesheets_update_policy" ON timesheets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "timesheets_delete_policy" ON timesheets
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- INVOICES
CREATE POLICY "invoices_select_policy" ON invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "invoices_insert_policy" ON invoices
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT
                CASE
                    WHEN is_master_admin THEN invoices.team_id
                    ELSE users.team_id
                END
            FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "invoices_update_policy" ON invoices
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "invoices_delete_policy" ON invoices
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- IMMIGRATION
CREATE POLICY "immigration_select_policy" ON immigration
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "immigration_insert_policy" ON immigration
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT
                CASE
                    WHEN is_master_admin THEN immigration.team_id
                    ELSE users.team_id
                END
            FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "immigration_update_policy" ON immigration
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "immigration_delete_policy" ON immigration
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- NOTES
CREATE POLICY "notes_select_policy" ON notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "notes_insert_policy" ON notes
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT
                CASE
                    WHEN is_master_admin THEN notes.team_id
                    ELSE users.team_id
                END
            FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "notes_update_policy" ON notes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "notes_delete_policy" ON notes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- ACTIVITIES
CREATE POLICY "activities_select_policy" ON activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
        OR
        team_id IN (
            SELECT team_id FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

CREATE POLICY "activities_insert_policy" ON activities
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT
                CASE
                    WHEN is_master_admin THEN activities.team_id
                    ELSE users.team_id
                END
            FROM users
            WHERE users.user_id = auth.uid()::text
        )
    );

-- No UPDATE or DELETE for activities (append-only audit log)

-- ================================================================
-- TEMPLATE DATA (READ-ONLY)
-- Everyone can read role templates and permissions (no team filter needed)
-- ================================================================

ALTER TABLE role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_permissions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read templates and permissions
CREATE POLICY "role_templates_select_policy" ON role_templates
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "permissions_select_policy" ON permissions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "template_permissions_select_policy" ON template_permissions
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only master admins can modify templates (rare, for system maintenance)
CREATE POLICY "role_templates_insert_policy" ON role_templates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
    );

CREATE POLICY "permissions_insert_policy" ON permissions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
    );

CREATE POLICY "template_permissions_insert_policy" ON template_permissions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()::text
            AND users.is_master_admin = true
        )
    );

-- ================================================================
-- END OF RLS POLICIES
-- ================================================================
