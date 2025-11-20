/**
 * Database Setup Script
 * This script creates all tables in Supabase PostgreSQL
 * Run: npm run db:setup
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const SQL_SCHEMA = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
  role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_name TEXT NOT NULL UNIQUE,
  role_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
  permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  permission_key TEXT NOT NULL UNIQUE,
  permission_description TEXT,
  module_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role Permissions (Junction Table)
CREATE TABLE IF NOT EXISTS role_permissions (
  role_permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
  allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role_id UUID REFERENCES roles(role_id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- VISA STATUS & IMMIGRATION
-- ============================================

CREATE TABLE IF NOT EXISTS visa_status (
  visa_status_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visa_name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CANDIDATES / CONSULTANTS
-- ============================================

CREATE TABLE IF NOT EXISTS candidates (
  candidate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  email_address TEXT UNIQUE,
  linkedin_url TEXT,
  ssn_last4 TEXT,
  date_of_birth DATE,
  passport_number TEXT,
  current_location TEXT,
  relocation_preference TEXT,
  visa_status_id UUID REFERENCES visa_status(visa_status_id),
  visa_expiry_date DATE,
  work_authorization_notes TEXT,
  total_experience_years NUMERIC(4,1),
  skills_primary TEXT,
  skills_secondary TEXT,
  preferred_roles TEXT,
  hourly_pay_rate NUMERIC(10,2),
  salary_annual NUMERIC(12,2),
  terms_percentage NUMERIC(5,2),
  bench_status TEXT DEFAULT 'available' CHECK (bench_status IN ('available', 'on_bench', 'placed', 'inactive')),
  bench_added_date DATE,
  sales_manager_id UUID REFERENCES users(user_id),
  sales_executive_id UUID REFERENCES users(user_id),
  recruiter_manager_id UUID REFERENCES users(user_id),
  recruiter_executive_id UUID REFERENCES users(user_id),
  notes_internal TEXT,
  resume_master_file_id UUID,
  attachments_group_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(user_id),
  updated_by UUID REFERENCES users(user_id)
);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email_address);
CREATE INDEX IF NOT EXISTS idx_candidates_phone ON candidates(phone_number);
CREATE INDEX IF NOT EXISTS idx_candidates_bench_status ON candidates(bench_status);
CREATE INDEX IF NOT EXISTS idx_candidates_name ON candidates(first_name, last_name);

-- ============================================
-- ATTACHMENTS & FILES
-- ============================================

CREATE TABLE IF NOT EXISTS attachments (
  attachment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  file_url TEXT NOT NULL,
  storage_path TEXT,
  version_number INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);

-- ============================================
-- BENCH HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS bench_history (
  bench_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidates(candidate_id) ON DELETE CASCADE,
  bench_added_date DATE NOT NULL,
  bench_removed_date DATE,
  reason_bench_out TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bench_history_candidate ON bench_history(candidate_id);

-- ============================================
-- VENDORS
-- ============================================

CREATE TABLE IF NOT EXISTS vendors (
  vendor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_name TEXT NOT NULL,
  tier_level TEXT CHECK (tier_level IN ('Tier 1', 'Tier 2', 'Tier 3', 'MSP', 'Direct')),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  preferred_communication_mode TEXT,
  payment_terms TEXT,
  payment_terms_days INTEGER,
  client_associated_id UUID,
  website TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(user_id),
  updated_by UUID REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active);

-- ============================================
-- CLIENTS
-- ============================================

CREATE TABLE IF NOT EXISTS clients (
  client_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name TEXT NOT NULL,
  industry TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  msp_portal_name TEXT,
  msp_portal_link TEXT,
  payment_terms TEXT,
  payment_terms_days INTEGER,
  website TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(user_id),
  updated_by UUID REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(client_name);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active);

-- ============================================
-- JOB REQUIREMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS job_requirements (
  job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_title TEXT NOT NULL,
  job_description TEXT,
  skills_required TEXT,
  vendor_id UUID REFERENCES vendors(vendor_id),
  client_id UUID REFERENCES clients(client_id),
  location TEXT,
  work_mode TEXT CHECK (work_mode IN ('Remote', 'Hybrid', 'Onsite')),
  bill_rate_range_min NUMERIC(10,2),
  bill_rate_range_max NUMERIC(10,2),
  employment_type TEXT CHECK (employment_type IN ('W2', 'C2C', '1099', 'Contract', 'Full-Time')),
  duration TEXT,
  priority TEXT CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  received_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'on_hold', 'filled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(user_id),
  updated_by UUID REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_job_requirements_status ON job_requirements(status);
CREATE INDEX IF NOT EXISTS idx_job_requirements_client ON job_requirements(client_id);
CREATE INDEX IF NOT EXISTS idx_job_requirements_vendor ON job_requirements(vendor_id);

-- ============================================
-- SUBMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS submissions (
  submission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidates(candidate_id),
  job_id UUID NOT NULL REFERENCES job_requirements(job_id),
  resume_file_id UUID,
  submitted_by_user_id UUID REFERENCES users(user_id),
  vendor_contact_id UUID,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submission_status TEXT DEFAULT 'submitted' CHECK (submission_status IN ('submitted', 'screening', 'shortlisted', 'rejected', 'interview_scheduled', 'offered', 'accepted', 'declined', 'withdrawn')),
  bill_rate_offered NUMERIC(10,2),
  pay_rate_offered NUMERIC(10,2),
  margin NUMERIC(10,2),
  notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_candidate ON submissions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_submissions_job ON submissions(job_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(submission_status);

-- ============================================
-- INTERVIEWS
-- ============================================

CREATE TABLE IF NOT EXISTS interviews (
  interview_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(submission_id),
  interview_round TEXT,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  interviewer_name TEXT,
  interviewer_email TEXT,
  interview_mode TEXT CHECK (interview_mode IN ('Phone', 'Video', 'In-Person', 'Technical', 'HR')),
  meeting_link TEXT,
  result TEXT CHECK (result IN ('Passed', 'Failed', 'Pending', 'Cancelled', 'No Show')),
  feedback_notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_submission ON interviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_time ON interviews(scheduled_time);

-- ============================================
-- PROJECTS / PLACEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS projects (
  project_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidates(candidate_id),
  client_id UUID NOT NULL REFERENCES clients(client_id),
  vendor_id UUID REFERENCES vendors(vendor_id),
  job_id UUID REFERENCES job_requirements(job_id),
  submission_id UUID REFERENCES submissions(submission_id),
  project_name TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  bill_rate_final NUMERIC(10,2),
  pay_rate_final NUMERIC(10,2),
  margin NUMERIC(10,2),
  po_number TEXT,
  sow_document_file_id UUID,
  client_manager_name TEXT,
  client_manager_email TEXT,
  timesheet_portal TEXT,
  timesheet_cycle TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated', 'on_hold')),
  termination_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(user_id),
  updated_by UUID REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_projects_candidate ON projects(candidate_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ============================================
-- TIMESHEETS
-- ============================================

CREATE TABLE IF NOT EXISTS timesheets (
  timesheet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(project_id),
  candidate_id UUID NOT NULL REFERENCES candidates(candidate_id),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  hours_worked NUMERIC(5,2) DEFAULT 0,
  regular_hours NUMERIC(5,2) DEFAULT 0,
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  approved_by_client BOOLEAN DEFAULT false,
  approval_date DATE,
  submitted_date DATE,
  invoice_generated BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timesheets_project ON timesheets(project_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_candidate ON timesheets(candidate_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_week ON timesheets(week_start, week_end);

-- ============================================
-- INVOICES
-- ============================================

CREATE TABLE IF NOT EXISTS invoices (
  invoice_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(project_id),
  timesheet_id UUID REFERENCES timesheets(timesheet_id),
  client_id UUID NOT NULL REFERENCES clients(client_id),
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_amount NUMERIC(12,2) NOT NULL,
  invoice_date DATE NOT NULL,
  payment_due_date DATE,
  payment_received_date DATE,
  payment_amount NUMERIC(12,2),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ============================================
-- IMMIGRATION & COMPLIANCE
-- ============================================

CREATE TABLE IF NOT EXISTS immigration (
  immigration_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidates(candidate_id),
  visa_type TEXT,
  visa_expiry_date DATE,
  i94_expiry_date DATE,
  i797_copy_file_id UUID,
  passport_copy_file_id UUID,
  lca_number TEXT,
  petition_number TEXT,
  worksite_address TEXT,
  immigration_notes TEXT,
  alert_before_days INTEGER DEFAULT 90,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_immigration_candidate ON immigration(candidate_id);
CREATE INDEX IF NOT EXISTS idx_immigration_visa_expiry ON immigration(visa_expiry_date);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
  audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_name TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'VIEW')),
  old_value_json JSONB,
  new_value_json JSONB,
  changed_fields TEXT[],
  performed_by_user_id UUID REFERENCES users(user_id),
  ip_address TEXT,
  user_agent TEXT,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(performed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_at ON audit_log(performed_at DESC);

-- ============================================
-- NOTES
-- ============================================

CREATE TABLE IF NOT EXISTS notes (
  note_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  note_text TEXT NOT NULL,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'important', 'follow_up', 'call', 'email', 'meeting')),
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);

-- ============================================
-- CONFIG DROPDOWNS
-- ============================================

CREATE TABLE IF NOT EXISTS config_dropdowns (
  config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category, value)
);

CREATE INDEX IF NOT EXISTS idx_config_category ON config_dropdowns(category);

-- ============================================
-- ACTIVITIES (For Timeline)
-- ============================================

CREATE TABLE IF NOT EXISTS activities (
  activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  activity_title TEXT NOT NULL,
  activity_description TEXT,
  metadata JSONB,
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(user_id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE column_name = 'updated_at'
    AND table_schema = 'public'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA SEEDING
-- ============================================

-- Insert default roles
INSERT INTO roles (role_name, role_description) VALUES
  ('Super Admin', 'Full system access with all permissions'),
  ('Sales Manager', 'Manages sales team and client relationships'),
  ('Sales Executive', 'Handles client submissions and vendor relationships'),
  ('Recruiter Manager', 'Manages recruiting team and candidate sourcing'),
  ('Recruiter Executive', 'Sources and manages candidates')
ON CONFLICT (role_name) DO NOTHING;

-- Insert default visa statuses
INSERT INTO visa_status (visa_name, description) VALUES
  ('H-1B', 'H-1B Specialty Occupation visa'),
  ('OPT', 'Optional Practical Training'),
  ('CPT', 'Curricular Practical Training'),
  ('STEM OPT', 'STEM OPT Extension'),
  ('GC-EAD', 'Green Card - Employment Authorization Document'),
  ('TN', 'TN visa for Canadian/Mexican citizens'),
  ('E3', 'E3 visa for Australian citizens'),
  ('USC', 'US Citizen'),
  ('Green Card', 'Permanent Resident'),
  ('L-1', 'Intracompany Transfer visa')
ON CONFLICT (visa_name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (permission_key, permission_description, module_name) VALUES
  -- Candidate permissions
  ('candidate.create', 'Create new candidates', 'Candidates'),
  ('candidate.read', 'View candidate details', 'Candidates'),
  ('candidate.update', 'Update candidate information', 'Candidates'),
  ('candidate.delete', 'Delete candidates', 'Candidates'),

  -- Vendor permissions
  ('vendor.create', 'Create new vendors', 'Vendors'),
  ('vendor.read', 'View vendor details', 'Vendors'),
  ('vendor.update', 'Update vendor information', 'Vendors'),
  ('vendor.delete', 'Delete vendors', 'Vendors'),

  -- Client permissions
  ('client.create', 'Create new clients', 'Clients'),
  ('client.read', 'View client details', 'Clients'),
  ('client.update', 'Update client information', 'Clients'),
  ('client.delete', 'Delete clients', 'Clients'),

  -- Job permissions
  ('job.create', 'Create new job requirements', 'Jobs'),
  ('job.read', 'View job requirements', 'Jobs'),
  ('job.update', 'Update job requirements', 'Jobs'),
  ('job.delete', 'Delete job requirements', 'Jobs'),

  -- Submission permissions
  ('submission.create', 'Create new submissions', 'Submissions'),
  ('submission.read', 'View submissions', 'Submissions'),
  ('submission.update', 'Update submissions', 'Submissions'),
  ('submission.delete', 'Delete submissions', 'Submissions'),

  -- Interview permissions
  ('interview.create', 'Schedule interviews', 'Interviews'),
  ('interview.read', 'View interviews', 'Interviews'),
  ('interview.update', 'Update interviews', 'Interviews'),
  ('interview.delete', 'Delete interviews', 'Interviews'),

  -- Project permissions
  ('project.create', 'Create new projects', 'Projects'),
  ('project.read', 'View projects', 'Projects'),
  ('project.update', 'Update projects', 'Projects'),
  ('project.delete', 'Delete projects', 'Projects'),

  -- Timesheet permissions
  ('timesheet.create', 'Create timesheets', 'Timesheets'),
  ('timesheet.read', 'View timesheets', 'Timesheets'),
  ('timesheet.update', 'Update timesheets', 'Timesheets'),
  ('timesheet.approve', 'Approve timesheets', 'Timesheets'),

  -- Invoice permissions
  ('invoice.create', 'Create invoices', 'Invoices'),
  ('invoice.read', 'View invoices', 'Invoices'),
  ('invoice.update', 'Update invoices', 'Invoices'),
  ('invoice.delete', 'Delete invoices', 'Invoices'),

  -- Immigration permissions
  ('immigration.create', 'Add immigration records', 'Immigration'),
  ('immigration.read', 'View immigration records', 'Immigration'),
  ('immigration.update', 'Update immigration records', 'Immigration'),

  -- User management
  ('user.create', 'Create new users', 'Users'),
  ('user.read', 'View users', 'Users'),
  ('user.update', 'Update users', 'Users'),
  ('user.delete', 'Delete users', 'Users'),

  -- Settings
  ('settings.manage', 'Manage system settings', 'Settings'),
  ('audit.view', 'View audit logs', 'Audit'),
  ('reports.view', 'View reports and analytics', 'Reports')
ON CONFLICT (permission_key) DO NOTHING;

-- Insert config dropdown values
INSERT INTO config_dropdowns (category, value, display_order) VALUES
  -- Bench Status
  ('bench_status', 'Available', 1),
  ('bench_status', 'On Bench', 2),
  ('bench_status', 'Placed', 3),
  ('bench_status', 'Inactive', 4),

  -- Work Mode
  ('work_mode', 'Remote', 1),
  ('work_mode', 'Hybrid', 2),
  ('work_mode', 'Onsite', 3),

  -- Employment Type
  ('employment_type', 'W2', 1),
  ('employment_type', 'C2C', 2),
  ('employment_type', '1099', 3),
  ('employment_type', 'Contract', 4),
  ('employment_type', 'Full-Time', 5),

  -- Priority
  ('priority', 'Low', 1),
  ('priority', 'Medium', 2),
  ('priority', 'High', 3),
  ('priority', 'Urgent', 4),

  -- Vendor Tier
  ('vendor_tier', 'Tier 1', 1),
  ('vendor_tier', 'Tier 2', 2),
  ('vendor_tier', 'Tier 3', 3),
  ('vendor_tier', 'MSP', 4),
  ('vendor_tier', 'Direct', 5),

  -- Interview Mode
  ('interview_mode', 'Phone', 1),
  ('interview_mode', 'Video', 2),
  ('interview_mode', 'In-Person', 3),
  ('interview_mode', 'Technical', 4),
  ('interview_mode', 'HR', 5),

  -- Submission Status
  ('submission_status', 'Submitted', 1),
  ('submission_status', 'Screening', 2),
  ('submission_status', 'Shortlisted', 3),
  ('submission_status', 'Interview Scheduled', 4),
  ('submission_status', 'Offered', 5),
  ('submission_status', 'Accepted', 6),
  ('submission_status', 'Rejected', 7),
  ('submission_status', 'Declined', 8),
  ('submission_status', 'Withdrawn', 9)
ON CONFLICT (category, value) DO NOTHING;

COMMIT;
`;

async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  console.log('📊 Creating tables and initial data...\n');

  try {
    // Execute the SQL schema
    const { error } = await supabase.rpc('exec_sql', { sql: SQL_SCHEMA });

    if (error) {
      console.error('❌ Error creating database schema:', error);

      // Try alternative method: Split and execute statements one by one
      console.log('\n⚠️  Trying alternative setup method...\n');

      const statements = SQL_SCHEMA.split(';').filter(s => s.trim());

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].trim();
        if (stmt) {
          try {
            await supabase.rpc('exec_sql', { sql: stmt + ';' });
            console.log(`✅ Executed statement ${i + 1}/${statements.length}`);
          } catch (err) {
            console.error(`❌ Error on statement ${i + 1}:`, err.message);
          }
        }
      }
    } else {
      console.log('✅ Database schema created successfully!');
    }

    console.log('\n✨ Database setup completed!\n');
    console.log('📝 Next steps:');
    console.log('   1. Run: npm install');
    console.log('   2. Run: npm run dev');
    console.log('   3. Visit: http://localhost:3000\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
