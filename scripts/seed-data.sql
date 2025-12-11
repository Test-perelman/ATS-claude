-- ================================================================
-- ATS Seed Data
-- Role Templates, Permissions, and Template Permissions
-- ================================================================
-- Run this after schema-v2.sql to populate system data
-- ================================================================

-- ================================================================
-- 1. ROLE TEMPLATES
-- ================================================================

INSERT INTO role_templates (template_id, template_name, description, is_admin_role, is_system_template) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Local Admin', 'Team administrator with full permissions to manage team, users, roles, and all data', true, true),
    ('00000000-0000-0000-0000-000000000002', 'Sales Manager', 'Manages sales team, clients, requirements, and can view all submissions', false, true),
    ('00000000-0000-0000-0000-000000000003', 'Sales Executive', 'Handles client relationships, job requirements, and submissions', false, true),
    ('00000000-0000-0000-0000-000000000004', 'Recruiter Manager', 'Manages recruiting team, vendors, and candidate pipeline', false, true),
    ('00000000-0000-0000-0000-000000000005', 'Recruiter', 'Sources and manages candidates, creates submissions', false, true),
    ('00000000-0000-0000-0000-000000000006', 'Account Manager', 'Manages client accounts, projects, and timesheets', false, true),
    ('00000000-0000-0000-0000-000000000007', 'Viewer', 'Read-only access to most data', false, true),
    ('00000000-0000-0000-0000-000000000008', 'Finance Manager', 'Manages invoicing, timesheets, and financial data', false, true);

-- ================================================================
-- 2. PERMISSIONS
-- Define all CRUD permissions for each module
-- ================================================================

-- Candidates Module
INSERT INTO permissions (permission_key, permission_name, module, description) VALUES
    ('candidates.create', 'Create Candidates', 'candidates', 'Can create new candidate records'),
    ('candidates.read', 'Read Candidates', 'candidates', 'Can view candidate records'),
    ('candidates.update', 'Update Candidates', 'candidates', 'Can edit candidate records'),
    ('candidates.delete', 'Delete Candidates', 'candidates', 'Can delete candidate records'),
    ('candidates.export', 'Export Candidates', 'candidates', 'Can export candidate data');

-- Vendors Module
INSERT INTO permissions (permission_key, permission_name, module, description) VALUES
    ('vendors.create', 'Create Vendors', 'vendors', 'Can create new vendor records'),
    ('vendors.read', 'Read Vendors', 'vendors', 'Can view vendor records'),
    ('vendors.update', 'Update Vendors', 'vendors', 'Can edit vendor records'),
    ('vendors.delete', 'Delete Vendors', 'vendors', 'Can delete vendor records'),
    ('vendors.export', 'Export Vendors', 'vendors', 'Can export vendor data');

-- Clients Module
INSERT INTO permissions (permission_key, permission_name, module, description) VALUES
    ('clients.create', 'Create Clients', 'clients', 'Can create new client records'),
    ('clients.read', 'Read Clients', 'clients', 'Can view client records'),
    ('clients.update', 'Update Clients', 'clients', 'Can edit client records'),
    ('clients.delete', 'Delete Clients', 'clients', 'Can delete client records'),
    ('clients.export', 'Export Clients', 'clients', 'Can export client data');

-- Requirements Module
INSERT INTO permissions (permission_key, permission_name, module, description) VALUES
    ('requirements.create', 'Create Requirements', 'requirements', 'Can create new job requirements'),
    ('requirements.read', 'Read Requirements', 'requirements', 'Can view job requirements'),
    ('requirements.update', 'Update Requirements', 'requirements', 'Can edit job requirements'),
    ('requirements.delete', 'Delete Requirements', 'requirements', 'Can delete job requirements'),
    ('requirements.export', 'Export Requirements', 'requirements', 'Can export requirements data');

-- Submissions Module
INSERT INTO permissions (permission_key, permission_name, module, description) VALUES
    ('submissions.create', 'Create Submissions', 'submissions', 'Can create candidate submissions'),
    ('submissions.read', 'Read Submissions', 'submissions', 'Can view candidate submissions'),
    ('submissions.update', 'Update Submissions', 'submissions', 'Can edit candidate submissions'),
    ('submissions.delete', 'Delete Submissions', 'submissions', 'Can delete candidate submissions'),
    ('submissions.export', 'Export Submissions', 'submissions', 'Can export submissions data');

-- Interviews Module
INSERT INTO permissions (permission_key, permission_name, module, description) VALUES
    ('interviews.create', 'Create Interviews', 'interviews', 'Can schedule interviews'),
    ('interviews.read', 'Read Interviews', 'interviews', 'Can view interview schedules'),
    ('interviews.update', 'Update Interviews', 'interviews', 'Can edit interviews'),
    ('interviews.delete', 'Delete Interviews', 'interviews', 'Can delete interviews'),
    ('interviews.export', 'Export Interviews', 'interviews', 'Can export interview data');

-- Projects Module
INSERT INTO permissions (permission_key, permission_name, module, description) VALUES
    ('projects.create', 'Create Projects', 'projects', 'Can create new projects'),
    ('projects.read', 'Read Projects', 'projects', 'Can view projects'),
    ('projects.update', 'Update Projects', 'projects', 'Can edit projects'),
    ('projects.delete', 'Delete Projects', 'projects', 'Can delete projects'),
    ('projects.export', 'Export Projects', 'projects', 'Can export project data');

-- Timesheets Module
INSERT INTO permissions (permission_key, permission_name, module, description) VALUES
    ('timesheets.create', 'Create Timesheets', 'timesheets', 'Can create timesheets'),
    ('timesheets.read', 'Read Timesheets', 'timesheets', 'Can view timesheets'),
    ('timesheets.update', 'Update Timesheets', 'timesheets', 'Can edit timesheets'),
    ('timesheets.delete', 'Delete Timesheets', 'timesheets', 'Can delete timesheets'),
    ('timesheets.approve', 'Approve Timesheets', 'timesheets', 'Can approve timesheets for payment'),
    ('timesheets.export', 'Export Timesheets', 'timesheets', 'Can export timesheet data');

-- Invoices Module
INSERT INTO permissions (permission_key, permission_name, module, description) VALUES
    ('invoices.create', 'Create Invoices', 'invoices', 'Can create invoices'),
    ('invoices.read', 'Read Invoices', 'invoices', 'Can view invoices'),
    ('invoices.update', 'Update Invoices', 'invoices', 'Can edit invoices'),
    ('invoices.delete', 'Delete Invoices', 'invoices', 'Can delete invoices'),
    ('invoices.send', 'Send Invoices', 'invoices', 'Can send invoices to clients'),
    ('invoices.export', 'Export Invoices', 'invoices', 'Can export invoice data');

-- Immigration Module
INSERT INTO permissions (permission_key, permission_name, module, description) VALUES
    ('immigration.create', 'Create Immigration Cases', 'immigration', 'Can create immigration case records'),
    ('immigration.read', 'Read Immigration Cases', 'immigration', 'Can view immigration cases'),
    ('immigration.update', 'Update Immigration Cases', 'immigration', 'Can edit immigration cases'),
    ('immigration.delete', 'Delete Immigration Cases', 'immigration', 'Can delete immigration cases'),
    ('immigration.export', 'Export Immigration Cases', 'immigration', 'Can export immigration data');

-- Users Module
INSERT INTO permissions (permission_key, permission_name, module, description) VALUES
    ('users.create', 'Create Users', 'users', 'Can invite and create new users'),
    ('users.read', 'Read Users', 'users', 'Can view user information'),
    ('users.update', 'Update Users', 'users', 'Can edit user information'),
    ('users.delete', 'Delete Users', 'users', 'Can delete/deactivate users'),
    ('users.manage-roles', 'Manage User Roles', 'users', 'Can assign roles to users');

-- Roles Module
INSERT INTO permissions (permission_key, permission_name, module, description) VALUES
    ('roles.create', 'Create Roles', 'roles', 'Can create custom roles'),
    ('roles.read', 'Read Roles', 'roles', 'Can view roles and permissions'),
    ('roles.update', 'Update Roles', 'roles', 'Can edit role permissions'),
    ('roles.delete', 'Delete Roles', 'roles', 'Can delete custom roles');

-- Reports Module
INSERT INTO permissions (permission_key, permission_name, module, description) VALUES
    ('reports.view', 'View Reports', 'reports', 'Can view standard reports'),
    ('reports.create', 'Create Reports', 'reports', 'Can create custom reports'),
    ('reports.export', 'Export Reports', 'reports', 'Can export report data');

-- Settings Module
INSERT INTO permissions (permission_key, permission_name, module, description) VALUES
    ('settings.read', 'Read Settings', 'settings', 'Can view team settings'),
    ('settings.update', 'Update Settings', 'settings', 'Can modify team settings');

-- Notes Module
INSERT INTO permissions (permission_key, permission_name, module, description) VALUES
    ('notes.create', 'Create Notes', 'notes', 'Can create notes on records'),
    ('notes.read', 'Read Notes', 'notes', 'Can view notes'),
    ('notes.update', 'Update Notes', 'notes', 'Can edit own notes'),
    ('notes.delete', 'Delete Notes', 'notes', 'Can delete own notes');

-- Activities Module
INSERT INTO permissions (permission_key, permission_name, module, description) VALUES
    ('activities.read', 'Read Activities', 'activities', 'Can view activity logs');

-- ================================================================
-- 3. TEMPLATE PERMISSIONS
-- Assign permissions to each role template
-- ================================================================

-- Helper: Get permission IDs (we'll reference by permission_key in actual assignments)

-- LOCAL ADMIN - Full permissions on everything
INSERT INTO template_permissions (template_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', permission_id FROM permissions;

-- SALES MANAGER - Full access to clients, requirements, submissions, interviews, projects
-- Read access to candidates, vendors
INSERT INTO template_permissions (template_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', permission_id FROM permissions
WHERE permission_key IN (
    -- Full Clients
    'clients.create', 'clients.read', 'clients.update', 'clients.delete', 'clients.export',
    -- Full Requirements
    'requirements.create', 'requirements.read', 'requirements.update', 'requirements.delete', 'requirements.export',
    -- Full Submissions
    'submissions.create', 'submissions.read', 'submissions.update', 'submissions.delete', 'submissions.export',
    -- Full Interviews
    'interviews.create', 'interviews.read', 'interviews.update', 'interviews.delete', 'interviews.export',
    -- Full Projects
    'projects.create', 'projects.read', 'projects.update', 'projects.delete', 'projects.export',
    -- Read Candidates
    'candidates.read', 'candidates.export',
    -- Read Vendors
    'vendors.read',
    -- Notes
    'notes.create', 'notes.read', 'notes.update', 'notes.delete',
    -- Activities
    'activities.read',
    -- Reports
    'reports.view', 'reports.create', 'reports.export',
    -- Settings Read
    'settings.read',
    -- Users Read
    'users.read'
);

-- SALES EXECUTIVE - Access to clients, requirements, submissions, interviews
INSERT INTO template_permissions (template_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', permission_id FROM permissions
WHERE permission_key IN (
    -- Clients
    'clients.create', 'clients.read', 'clients.update', 'clients.export',
    -- Requirements
    'requirements.create', 'requirements.read', 'requirements.update', 'requirements.export',
    -- Submissions
    'submissions.create', 'submissions.read', 'submissions.update', 'submissions.export',
    -- Interviews
    'interviews.create', 'interviews.read', 'interviews.update', 'interviews.export',
    -- Read Candidates
    'candidates.read',
    -- Read Projects
    'projects.read',
    -- Notes
    'notes.create', 'notes.read', 'notes.update', 'notes.delete',
    -- Activities
    'activities.read',
    -- Reports
    'reports.view', 'reports.export'
);

-- RECRUITER MANAGER - Full access to candidates, vendors, submissions
INSERT INTO template_permissions (template_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000004', permission_id FROM permissions
WHERE permission_key IN (
    -- Full Candidates
    'candidates.create', 'candidates.read', 'candidates.update', 'candidates.delete', 'candidates.export',
    -- Full Vendors
    'vendors.create', 'vendors.read', 'vendors.update', 'vendors.delete', 'vendors.export',
    -- Full Submissions
    'submissions.create', 'submissions.read', 'submissions.update', 'submissions.delete', 'submissions.export',
    -- Full Interviews
    'interviews.create', 'interviews.read', 'interviews.update', 'interviews.delete', 'interviews.export',
    -- Read Requirements
    'requirements.read', 'requirements.export',
    -- Read Clients
    'clients.read',
    -- Immigration
    'immigration.create', 'immigration.read', 'immigration.update', 'immigration.delete', 'immigration.export',
    -- Notes
    'notes.create', 'notes.read', 'notes.update', 'notes.delete',
    -- Activities
    'activities.read',
    -- Reports
    'reports.view', 'reports.create', 'reports.export',
    -- Users Read
    'users.read'
);

-- RECRUITER - Access to candidates, submissions, interviews
INSERT INTO template_permissions (template_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000005', permission_id FROM permissions
WHERE permission_key IN (
    -- Candidates
    'candidates.create', 'candidates.read', 'candidates.update', 'candidates.export',
    -- Submissions
    'submissions.create', 'submissions.read', 'submissions.update', 'submissions.export',
    -- Interviews
    'interviews.create', 'interviews.read', 'interviews.update', 'interviews.export',
    -- Read Vendors
    'vendors.read',
    -- Read Requirements
    'requirements.read',
    -- Immigration
    'immigration.create', 'immigration.read', 'immigration.update', 'immigration.export',
    -- Notes
    'notes.create', 'notes.read', 'notes.update', 'notes.delete',
    -- Activities
    'activities.read',
    -- Reports
    'reports.view'
);

-- ACCOUNT MANAGER - Access to clients, projects, timesheets, invoices
INSERT INTO template_permissions (template_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000006', permission_id FROM permissions
WHERE permission_key IN (
    -- Clients
    'clients.read', 'clients.update', 'clients.export',
    -- Projects
    'projects.create', 'projects.read', 'projects.update', 'projects.delete', 'projects.export',
    -- Timesheets
    'timesheets.create', 'timesheets.read', 'timesheets.update', 'timesheets.approve', 'timesheets.export',
    -- Invoices
    'invoices.create', 'invoices.read', 'invoices.update', 'invoices.send', 'invoices.export',
    -- Read Candidates
    'candidates.read',
    -- Read Requirements
    'requirements.read',
    -- Read Submissions
    'submissions.read',
    -- Notes
    'notes.create', 'notes.read', 'notes.update', 'notes.delete',
    -- Activities
    'activities.read',
    -- Reports
    'reports.view', 'reports.export'
);

-- VIEWER - Read-only access
INSERT INTO template_permissions (template_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000007', permission_id FROM permissions
WHERE permission_key IN (
    'candidates.read',
    'vendors.read',
    'clients.read',
    'requirements.read',
    'submissions.read',
    'interviews.read',
    'projects.read',
    'notes.read',
    'activities.read',
    'reports.view'
);

-- FINANCE MANAGER - Full access to timesheets, invoices, financial data
INSERT INTO template_permissions (template_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000008', permission_id FROM permissions
WHERE permission_key IN (
    -- Full Timesheets
    'timesheets.create', 'timesheets.read', 'timesheets.update', 'timesheets.delete', 'timesheets.approve', 'timesheets.export',
    -- Full Invoices
    'invoices.create', 'invoices.read', 'invoices.update', 'invoices.delete', 'invoices.send', 'invoices.export',
    -- Full Projects (for billing)
    'projects.read', 'projects.update', 'projects.export',
    -- Read Clients
    'clients.read', 'clients.export',
    -- Read Candidates
    'candidates.read',
    -- Notes
    'notes.create', 'notes.read', 'notes.update', 'notes.delete',
    -- Activities
    'activities.read',
    -- Reports
    'reports.view', 'reports.create', 'reports.export',
    -- Settings
    'settings.read'
);

-- ================================================================
-- VERIFICATION QUERIES
-- Uncomment to verify the data was inserted correctly
-- ================================================================

-- SELECT COUNT(*) as template_count FROM role_templates;
-- SELECT COUNT(*) as permission_count FROM permissions;
-- SELECT COUNT(*) as template_permission_count FROM template_permissions;

-- -- View permissions by template
-- SELECT
--     rt.template_name,
--     COUNT(tp.permission_id) as permission_count
-- FROM role_templates rt
-- LEFT JOIN template_permissions tp ON rt.template_id = tp.template_id
-- GROUP BY rt.template_id, rt.template_name
-- ORDER BY rt.template_name;

-- ================================================================
-- END OF SEED DATA
-- ================================================================
