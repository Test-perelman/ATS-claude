-- Populate role templates with default system roles
-- These templates are cloned for each new team during signup

-- 1. Local Admin Role Template
INSERT INTO role_templates (template_name, description, is_admin_role, is_system_template)
VALUES (
  'Local Admin',
  'Team administrator with full control over team data and settings',
  true,
  true
) ON CONFLICT (template_name) DO NOTHING;

-- 2. Sales Manager Role Template
INSERT INTO role_templates (template_name, description, is_admin_role, is_system_template)
VALUES (
  'Sales Manager',
  'Manages candidates, clients, and job placements',
  false,
  true
) ON CONFLICT (template_name) DO NOTHING;

-- 3. Recruiter Role Template
INSERT INTO role_templates (template_name, description, is_admin_role, is_system_template)
VALUES (
  'Recruiter',
  'Can view and manage candidates and submissions',
  false,
  true
) ON CONFLICT (template_name) DO NOTHING;

-- 4. Manager Role Template
INSERT INTO role_templates (template_name, description, is_admin_role, is_system_template)
VALUES (
  'Manager',
  'Can manage projects and team workflows',
  false,
  true
) ON CONFLICT (template_name) DO NOTHING;

-- 5. Finance Role Template
INSERT INTO role_templates (template_name, description, is_admin_role, is_system_template)
VALUES (
  'Finance',
  'Can manage invoices and timesheets',
  false,
  true
) ON CONFLICT (template_name) DO NOTHING;

-- 6. View-Only Role Template
INSERT INTO role_templates (template_name, description, is_admin_role, is_system_template)
VALUES (
  'View-Only',
  'Read-only access to all team data',
  false,
  true
) ON CONFLICT (template_name) DO NOTHING;

-- Now assign permissions to each template
-- We need to get all permission IDs first

-- Local Admin: Gets ALL permissions
INSERT INTO template_permissions (template_id, permission_id)
SELECT
  rt.template_id,
  p.id  -- FIXED: was p.permission_id, should be p.id
FROM role_templates rt
CROSS JOIN permissions p
WHERE rt.template_name = 'Local Admin'
  AND NOT EXISTS (
    SELECT 1 FROM template_permissions tp
    WHERE tp.template_id = rt.template_id
      AND tp.permission_id = p.id
  )
ON CONFLICT (template_id, permission_id) DO NOTHING;

-- Recruiter: Can view/manage candidates and submissions
INSERT INTO template_permissions (template_id, permission_id)
SELECT
  rt.template_id,
  p.id  -- FIXED: was p.permission_id, should be p.id
FROM role_templates rt
CROSS JOIN permissions p
WHERE rt.template_name = 'Recruiter'
  AND p.key IN (  -- FIXED: was p.permission_key, should be p.key
    'view_candidates', 'create_candidate', 'edit_candidate', 'delete_candidate',
    'view_submissions', 'create_submission', 'edit_submission', 'delete_submission',
    'view_interviews', 'create_interview', 'edit_interview', 'delete_interview'
  )
  AND NOT EXISTS (
    SELECT 1 FROM template_permissions tp
    WHERE tp.template_id = rt.template_id
      AND tp.permission_id = p.id
  )
ON CONFLICT (template_id, permission_id) DO NOTHING;

-- Sales Manager: Candidates, clients, vendors, requirements, projects
INSERT INTO template_permissions (template_id, permission_id)
SELECT
  rt.template_id,
  p.id  -- FIXED: was p.permission_id, should be p.id
FROM role_templates rt
CROSS JOIN permissions p
WHERE rt.template_name = 'Sales Manager'
  AND p.key IN (  -- FIXED: was p.permission_key, should be p.key
    'view_candidates', 'create_candidate', 'edit_candidate', 'delete_candidate',
    'view_clients', 'create_client', 'edit_client', 'delete_client',
    'view_vendors', 'create_vendor', 'edit_vendor', 'delete_vendor',
    'view_job_requirements', 'create_job_requirement', 'edit_job_requirement', 'delete_job_requirement',
    'view_projects', 'create_project', 'edit_project', 'delete_project',
    'view_submissions', 'create_submission', 'edit_submission'
  )
  AND NOT EXISTS (
    SELECT 1 FROM template_permissions tp
    WHERE tp.template_id = rt.template_id
      AND tp.permission_id = p.id
  )
ON CONFLICT (template_id, permission_id) DO NOTHING;

-- Manager: Projects, timesheets
INSERT INTO template_permissions (template_id, permission_id)
SELECT
  rt.template_id,
  p.id  -- FIXED: was p.permission_id, should be p.id
FROM role_templates rt
CROSS JOIN permissions p
WHERE rt.template_name = 'Manager'
  AND p.key IN (  -- FIXED: was p.permission_key, should be p.key
    'view_projects', 'create_project', 'edit_project',
    'view_timesheets', 'create_timesheet', 'edit_timesheet'
  )
  AND NOT EXISTS (
    SELECT 1 FROM template_permissions tp
    WHERE tp.template_id = rt.template_id
      AND tp.permission_id = p.id
  )
ON CONFLICT (template_id, permission_id) DO NOTHING;

-- Finance: Invoices and timesheets (read/write)
INSERT INTO template_permissions (template_id, permission_id)
SELECT
  rt.template_id,
  p.id  -- FIXED: was p.permission_id, should be p.id
FROM role_templates rt
CROSS JOIN permissions p
WHERE rt.template_name = 'Finance'
  AND p.key IN (  -- FIXED: was p.permission_key, should be p.key
    'view_invoices', 'create_invoice', 'edit_invoice',
    'view_timesheets', 'create_timesheet', 'edit_timesheet'
  )
  AND NOT EXISTS (
    SELECT 1 FROM template_permissions tp
    WHERE tp.template_id = rt.template_id
      AND tp.permission_id = p.id
  )
ON CONFLICT (template_id, permission_id) DO NOTHING;

-- View-Only: View permissions only (no create/edit/delete)
INSERT INTO template_permissions (template_id, permission_id)
SELECT
  rt.template_id,
  p.id  -- FIXED: was p.permission_id, should be p.id
FROM role_templates rt
CROSS JOIN permissions p
WHERE rt.template_name = 'View-Only'
  AND p.key LIKE 'view_%'  -- FIXED: was p.permission_key, should be p.key
  AND NOT EXISTS (
    SELECT 1 FROM template_permissions tp
    WHERE tp.template_id = rt.template_id
      AND tp.permission_id = p.id
  )
ON CONFLICT (template_id, permission_id) DO NOTHING;
