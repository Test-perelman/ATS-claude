-- Seed system permissions and default roles

-- ============================================================================
-- INSERT PERMISSIONS
-- ============================================================================

INSERT INTO permissions (key, name, module, created_at) VALUES
-- User Management
('create_user', 'Create User', 'users', NOW()),
('view_users', 'View Users', 'users', NOW()),
('edit_user', 'Edit User', 'users', NOW()),
('delete_user', 'Delete User', 'users', NOW()),

-- Role Management
('manage_roles', 'Manage Roles', 'roles', NOW()),
('assign_roles', 'Assign Roles', 'roles', NOW()),

-- Candidates
('create_candidate', 'Create Candidate', 'candidates', NOW()),
('view_candidates', 'View Candidates', 'candidates', NOW()),
('edit_candidate', 'Edit Candidate', 'candidates', NOW()),
('delete_candidate', 'Delete Candidate', 'candidates', NOW()),

-- Vendors
('create_vendor', 'Create Vendor', 'vendors', NOW()),
('view_vendors', 'View Vendors', 'vendors', NOW()),
('edit_vendor', 'Edit Vendor', 'vendors', NOW()),
('delete_vendor', 'Delete Vendor', 'vendors', NOW()),

-- Clients
('create_client', 'Create Client', 'clients', NOW()),
('view_clients', 'View Clients', 'clients', NOW()),
('edit_client', 'Edit Client', 'clients', NOW()),
('delete_client', 'Delete Client', 'clients', NOW()),

-- Jobs
('create_job', 'Create Job', 'jobs', NOW()),
('view_jobs', 'View Jobs', 'jobs', NOW()),
('edit_job', 'Edit Job', 'jobs', NOW()),
('delete_job', 'Delete Job', 'jobs', NOW()),

-- Submissions
('create_submission', 'Create Submission', 'submissions', NOW()),
('view_submissions', 'View Submissions', 'submissions', NOW()),
('edit_submission', 'Edit Submission', 'submissions', NOW()),
('delete_submission', 'Delete Submission', 'submissions', NOW()),

-- Interviews
('create_interview', 'Create Interview', 'interviews', NOW()),
('view_interviews', 'View Interviews', 'interviews', NOW()),
('edit_interview', 'Edit Interview', 'interviews', NOW()),
('delete_interview', 'Delete Interview', 'interviews', NOW()),

-- Projects
('create_project', 'Create Project', 'projects', NOW()),
('view_projects', 'View Projects', 'projects', NOW()),
('edit_project', 'Edit Project', 'projects', NOW()),
('delete_project', 'Delete Project', 'projects', NOW()),

-- Timesheets
('create_timesheet', 'Create Timesheet', 'timesheets', NOW()),
('view_timesheets', 'View Timesheets', 'timesheets', NOW()),
('edit_timesheet', 'Edit Timesheet', 'timesheets', NOW()),
('approve_timesheet', 'Approve Timesheet', 'timesheets', NOW()),

-- Invoices
('create_invoice', 'Create Invoice', 'invoices', NOW()),
('view_invoices', 'View Invoices', 'invoices', NOW()),
('edit_invoice', 'Edit Invoice', 'invoices', NOW()),
('delete_invoice', 'Delete Invoice', 'invoices', NOW()),

-- Immigration
('view_immigration', 'View Immigration', 'immigration', NOW()),
('edit_immigration', 'Edit Immigration', 'immigration', NOW())
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- CREATE DEFAULT ROLES + PERMISSIONS FOR NEW TEAMS
-- Called during user signup via trigger
-- ============================================================================

-- Owner role: Has all permissions
-- Manager role: Full CRUD on business entities
-- Recruiter role: Candidates, submissions, interviews
-- Finance role: Invoices, timesheets (approve)
-- Viewer role: Read-only access

INSERT INTO permissions (key, name, module, created_at) VALUES
('view_all', 'View All Data', 'global', NOW())
ON CONFLICT (key) DO NOTHING;
