-- Test data for development
-- Creates a test team with sample data

-- ============================================================================
-- INSERT TEST TEAM
-- ============================================================================

INSERT INTO teams (id, name, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111'::UUID, 'Test Team', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INSERT TEST ROLES WITH PERMISSIONS
-- ============================================================================

-- Owner role (all permissions)
INSERT INTO roles (id, team_id, name, is_admin, created_at) VALUES
('21111111-1111-1111-1111-111111111111'::UUID, '11111111-1111-1111-1111-111111111111'::UUID, 'owner', true, NOW())
ON CONFLICT DO NOTHING;

-- Manager role (most permissions)
INSERT INTO roles (id, team_id, name, is_admin, created_at) VALUES
('22222222-2222-2222-2222-222222222222'::UUID, '11111111-1111-1111-1111-111111111111'::UUID, 'manager', false, NOW())
ON CONFLICT DO NOTHING;

-- Recruiter role (candidate/submission/interview)
INSERT INTO roles (id, team_id, name, is_admin, created_at) VALUES
('23333333-3333-3333-3333-333333333333'::UUID, '11111111-1111-1111-1111-111111111111'::UUID, 'recruiter', false, NOW())
ON CONFLICT DO NOTHING;

-- Viewer role (read-only)
INSERT INTO roles (id, team_id, name, is_admin, created_at) VALUES
('24444444-4444-4444-4444-444444444444'::UUID, '11111111-1111-1111-1111-111111111111'::UUID, 'viewer', false, NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ASSIGN PERMISSIONS TO ROLES
-- ============================================================================

-- Owner: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '21111111-1111-1111-1111-111111111111'::UUID, id FROM permissions
ON CONFLICT DO NOTHING;

-- Manager: Business entity management
INSERT INTO role_permissions (role_id, permission_id)
SELECT '22222222-2222-2222-2222-222222222222'::UUID, id FROM permissions
WHERE key IN (
  'view_users', 'view_candidates', 'create_candidate', 'edit_candidate', 'delete_candidate',
  'view_vendors', 'create_vendor', 'edit_vendor', 'delete_vendor',
  'view_clients', 'create_client', 'edit_client', 'delete_client',
  'view_jobs', 'create_job', 'edit_job', 'delete_job',
  'view_submissions', 'create_submission', 'edit_submission', 'delete_submission',
  'view_interviews', 'create_interview', 'edit_interview', 'delete_interview',
  'view_projects', 'create_project', 'edit_project', 'delete_project',
  'view_timesheets', 'view_invoices', 'create_invoice', 'edit_invoice',
  'view_immigration'
)
ON CONFLICT DO NOTHING;

-- Recruiter: Candidate/submission/interview focus
INSERT INTO role_permissions (role_id, permission_id)
SELECT '23333333-3333-3333-3333-333333333333'::UUID, id FROM permissions
WHERE key IN (
  'view_candidates', 'create_candidate', 'edit_candidate',
  'view_vendors', 'view_clients', 'view_jobs',
  'create_submission', 'view_submissions', 'edit_submission',
  'create_interview', 'view_interviews', 'edit_interview',
  'view_projects', 'view_timesheets'
)
ON CONFLICT DO NOTHING;

-- Viewer: Read-only
INSERT INTO role_permissions (role_id, permission_id)
SELECT '24444444-4444-4444-4444-444444444444'::UUID, id FROM permissions
WHERE key LIKE 'view_%'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- INSERT TEST DATA (clients, candidates, jobs, etc)
-- ============================================================================

INSERT INTO clients (id, team_id, name, industry, created_at, updated_at) VALUES
('31111111-1111-1111-1111-111111111111'::UUID, '11111111-1111-1111-1111-111111111111'::UUID, 'Acme Corp', 'Technology', NOW(), NOW()),
('32222222-2222-2222-2222-222222222222'::UUID, '11111111-1111-1111-1111-111111111111'::UUID, 'Global Solutions', 'Consulting', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO candidates (id, team_id, first_name, last_name, email, current_title, experience_years, created_at, updated_at) VALUES
('41111111-1111-1111-1111-111111111111'::UUID, '11111111-1111-1111-1111-111111111111'::UUID, 'John', 'Doe', 'john@example.com', 'Senior Developer', 5, NOW(), NOW()),
('42222222-2222-2222-2222-222222222222'::UUID, '11111111-1111-1111-1111-111111111111'::UUID, 'Jane', 'Smith', 'jane@example.com', 'Product Manager', 3, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO vendors (id, team_id, name, email, created_at, updated_at) VALUES
('51111111-1111-1111-1111-111111111111'::UUID, '11111111-1111-1111-1111-111111111111'::UUID, 'TalentPool Inc', 'info@talentpool.com', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO job_requirements (id, team_id, client_id, title, status, created_at, updated_at) VALUES
('61111111-1111-1111-1111-111111111111'::UUID, '11111111-1111-1111-1111-111111111111'::UUID, '31111111-1111-1111-1111-111111111111'::UUID, 'Senior Software Engineer', 'open', NOW(), NOW()),
('62222222-2222-2222-2222-222222222222'::UUID, '11111111-1111-1111-1111-111111111111'::UUID, '32222222-2222-2222-2222-222222222222'::UUID, 'Product Manager', 'open', NOW(), NOW())
ON CONFLICT DO NOTHING;
