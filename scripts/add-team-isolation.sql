-- ============================================
-- TEAM ISOLATION & ACCESS REQUESTS
-- ============================================
-- This script adds multi-tenant support by:
-- 1. Creating team_access_requests table
-- 2. Adding team_id to all entity tables
-- 3. Creating indexes for performance
-- 4. Creating Row Level Security policies
-- ============================================

-- ============================================
-- NEW TABLE: TEAM ACCESS REQUESTS
-- ============================================

CREATE TABLE IF NOT EXISTS team_access_requests (
  request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company_email TEXT NOT NULL,
  reason TEXT,
  requested_team_id UUID,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(auth_user_id, requested_team_id)
);

CREATE INDEX IF NOT EXISTS idx_access_requests_status ON team_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_team ON team_access_requests(requested_team_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_auth_user ON team_access_requests(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_created_at ON team_access_requests(created_at DESC);

-- ============================================
-- ADD team_id TO ENTITY TABLES
-- ============================================

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(team_id) ON DELETE CASCADE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(team_id) ON DELETE CASCADE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(team_id) ON DELETE CASCADE;
ALTER TABLE job_requirements ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(team_id) ON DELETE CASCADE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(team_id) ON DELETE CASCADE;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(team_id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(team_id) ON DELETE CASCADE;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(team_id) ON DELETE CASCADE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(team_id) ON DELETE CASCADE;
ALTER TABLE immigration ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(team_id) ON DELETE CASCADE;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(team_id) ON DELETE CASCADE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(team_id) ON DELETE CASCADE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(team_id) ON DELETE CASCADE;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_candidates_team ON candidates(team_id);
CREATE INDEX IF NOT EXISTS idx_candidates_team_status ON candidates(team_id, bench_status);
CREATE INDEX IF NOT EXISTS idx_vendors_team ON vendors(team_id);
CREATE INDEX IF NOT EXISTS idx_vendors_team_active ON vendors(team_id, is_active);
CREATE INDEX IF NOT EXISTS idx_clients_team ON clients(team_id);
CREATE INDEX IF NOT EXISTS idx_clients_team_active ON clients(team_id, is_active);
CREATE INDEX IF NOT EXISTS idx_job_requirements_team ON job_requirements(team_id);
CREATE INDEX IF NOT EXISTS idx_job_requirements_team_status ON job_requirements(team_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_team ON submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_submissions_team_status ON submissions(team_id, submission_status);
CREATE INDEX IF NOT EXISTS idx_interviews_team ON interviews(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_team_status ON projects(team_id, status);
CREATE INDEX IF NOT EXISTS idx_timesheets_team ON timesheets(team_id);
CREATE INDEX IF NOT EXISTS idx_invoices_team ON invoices(team_id);
CREATE INDEX IF NOT EXISTS idx_invoices_team_status ON invoices(team_id, status);
CREATE INDEX IF NOT EXISTS idx_immigration_team ON immigration(team_id);
CREATE INDEX IF NOT EXISTS idx_attachments_team ON attachments(team_id);
CREATE INDEX IF NOT EXISTS idx_activities_team ON activities(team_id);
CREATE INDEX IF NOT EXISTS idx_notes_team ON notes(team_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Enable RLS on all entity tables

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
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_access_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see data from their team
CREATE POLICY team_isolation_candidates ON candidates
  FOR ALL
  USING (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()))
  WITH CHECK (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()));

CREATE POLICY team_isolation_vendors ON vendors
  FOR ALL
  USING (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()))
  WITH CHECK (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()));

CREATE POLICY team_isolation_clients ON clients
  FOR ALL
  USING (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()))
  WITH CHECK (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()));

CREATE POLICY team_isolation_job_requirements ON job_requirements
  FOR ALL
  USING (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()))
  WITH CHECK (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()));

CREATE POLICY team_isolation_submissions ON submissions
  FOR ALL
  USING (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()))
  WITH CHECK (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()));

CREATE POLICY team_isolation_interviews ON interviews
  FOR ALL
  USING (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()))
  WITH CHECK (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()));

CREATE POLICY team_isolation_projects ON projects
  FOR ALL
  USING (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()))
  WITH CHECK (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()));

CREATE POLICY team_isolation_timesheets ON timesheets
  FOR ALL
  USING (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()))
  WITH CHECK (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()));

CREATE POLICY team_isolation_invoices ON invoices
  FOR ALL
  USING (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()))
  WITH CHECK (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()));

CREATE POLICY team_isolation_immigration ON immigration
  FOR ALL
  USING (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()))
  WITH CHECK (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()));

CREATE POLICY team_isolation_attachments ON attachments
  FOR ALL
  USING (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()))
  WITH CHECK (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()));

CREATE POLICY team_isolation_activities ON activities
  FOR ALL
  USING (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()))
  WITH CHECK (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()));

CREATE POLICY team_isolation_notes ON notes
  FOR ALL
  USING (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()))
  WITH CHECK (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()));

-- Policy: Users can view access requests for their team (only team admins)
CREATE POLICY team_access_requests_view ON team_access_requests
  FOR SELECT
  USING (
    requested_team_id = (SELECT team_id FROM users WHERE user_id = auth.uid())
    AND (SELECT role_id FROM users WHERE user_id = auth.uid())
      IN (SELECT role_id FROM roles WHERE role_name IN ('Super Admin', 'Admin'))
  );

-- ============================================
-- COMPLETED
-- ============================================
-- Run this script in Supabase to add team isolation
-- Then run the Node.js migration scripts to:
-- 1. Assign existing entities to teams
-- 2. Create default "Admin" role if needed
-- ============================================
