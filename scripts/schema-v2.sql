-- ================================================================
-- ATS Database Schema V2
-- Multi-Tenant Architecture with Advanced Permission System
-- ================================================================
--
-- ARCHITECTURE PRINCIPLES:
-- 1. Strict multi-tenant isolation (teams = companies)
-- 2. Team-scoped roles and permissions
-- 3. Master admin (team_id = NULL) can see all teams
-- 4. Local admin can manage their team
-- 5. Performance-first design with proper indexes
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- CORE TABLES
-- ================================================================

-- 1. TEAMS: Company/tenant container
-- Each team represents a separate company with isolated data
-- ================================================================
CREATE TABLE teams (
    team_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'professional', 'enterprise')),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    settings JSONB DEFAULT '{}' NOT NULL
);

-- Indexes for teams
CREATE INDEX idx_teams_is_active ON teams(is_active);
CREATE INDEX idx_teams_created_at ON teams(created_at DESC);

-- 2. ROLE TEMPLATES: System-provided role templates
-- These are cloned for each team on signup
-- ================================================================
CREATE TABLE role_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_admin_role BOOLEAN DEFAULT false NOT NULL,
    is_system_template BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. ROLES: Team-specific roles
-- Each team has their own copy of roles (cloned from templates or custom)
-- ================================================================
CREATE TABLE roles (
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    based_on_template UUID REFERENCES role_templates(template_id) ON DELETE SET NULL,
    is_admin_role BOOLEAN DEFAULT false NOT NULL,
    is_custom BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(role_name, team_id)
);

-- Indexes for roles
CREATE INDEX idx_roles_team_id ON roles(team_id);
CREATE INDEX idx_roles_based_on_template ON roles(based_on_template);
CREATE INDEX idx_roles_is_admin ON roles(is_admin_role) WHERE is_admin_role = true;

-- 4. PERMISSIONS: System-wide permission definitions
-- Defines all possible permissions in the system
-- ================================================================
CREATE TABLE permissions (
    permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permission_key VARCHAR(100) UNIQUE NOT NULL,
    permission_name VARCHAR(255) NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for permissions
CREATE INDEX idx_permissions_module ON permissions(module);
CREATE INDEX idx_permissions_key ON permissions(permission_key);

-- 5. TEMPLATE PERMISSIONS: Default permissions for role templates
-- Defines which permissions each template has by default
-- ================================================================
CREATE TABLE template_permissions (
    template_id UUID NOT NULL REFERENCES role_templates(template_id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (template_id, permission_id)
);

-- Indexes for template_permissions
CREATE INDEX idx_template_permissions_template ON template_permissions(template_id);
CREATE INDEX idx_template_permissions_permission ON template_permissions(permission_id);

-- 6. ROLE PERMISSIONS: Team-specific role permissions
-- Local admins can customize these for their team
-- ================================================================
CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

-- Indexes for role_permissions
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- 7. USERS: User accounts
-- Links to Supabase auth.users, belongs to one team (except master admins)
-- ================================================================
CREATE TABLE users (
    user_id TEXT PRIMARY KEY, -- Matches Supabase auth.users.id
    team_id UUID REFERENCES teams(team_id) ON DELETE SET NULL,
    role_id UUID REFERENCES roles(role_id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_master_admin BOOLEAN DEFAULT false NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    avatar_url TEXT,

    -- CRITICAL CONSTRAINT: Master admins have no team/role, regular users must have both
    CONSTRAINT check_admin_team_role CHECK (
        (is_master_admin = true AND team_id IS NULL AND role_id IS NULL) OR
        (is_master_admin = false AND team_id IS NOT NULL AND role_id IS NOT NULL)
    )
);

-- Indexes for users
CREATE INDEX idx_users_team_id ON users(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_master_admin ON users(is_master_admin) WHERE is_master_admin = true;
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_status ON users(status);

-- ================================================================
-- BUSINESS ENTITY TABLES
-- All follow the same multi-tenant pattern
-- ================================================================

-- 8. CANDIDATES: Job candidates
-- ================================================================
CREATE TABLE candidates (
    candidate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,

    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    location VARCHAR(255),

    -- Professional Information
    current_title VARCHAR(255),
    current_employer VARCHAR(255),
    linkedin_url TEXT,
    resume_url TEXT,
    skills TEXT[],
    experience_years INTEGER,

    -- Status and Metadata
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn')) NOT NULL,
    source VARCHAR(100),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,

    -- Audit fields
    created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Team-scoped uniqueness
    UNIQUE(team_id, email)
);

-- Indexes for candidates
CREATE INDEX idx_candidates_team_status ON candidates(team_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_candidates_team_created ON candidates(team_id, created_at DESC);
CREATE INDEX idx_candidates_email ON candidates(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_candidates_created_by ON candidates(created_by);

-- 9. VENDORS: Staffing vendors/partners
-- ================================================================
CREATE TABLE vendors (
    vendor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,

    -- Vendor Information
    vendor_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    website TEXT,

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100),

    -- Business Details
    tax_id VARCHAR(50),
    payment_terms VARCHAR(100),
    preferred_payment_method VARCHAR(50),

    -- Status and Metadata
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'blacklisted')) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,

    -- Audit fields
    created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Team-scoped uniqueness
    UNIQUE(team_id, vendor_name),
    UNIQUE(team_id, email)
);

-- Indexes for vendors
CREATE INDEX idx_vendors_team_status ON vendors(team_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_team_created ON vendors(team_id, created_at DESC);
CREATE INDEX idx_vendors_email ON vendors(email) WHERE deleted_at IS NULL;

-- 10. CLIENTS: Client companies
-- ================================================================
CREATE TABLE clients (
    client_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,

    -- Client Information
    client_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    website TEXT,

    -- Primary Contact
    primary_contact_name VARCHAR(255),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(50),

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100),

    -- Business Details
    company_size VARCHAR(50),
    annual_revenue VARCHAR(50),

    -- Status and Metadata
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect', 'former')) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,

    -- Audit fields
    created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Team-scoped uniqueness
    UNIQUE(team_id, client_name)
);

-- Indexes for clients
CREATE INDEX idx_clients_team_status ON clients(team_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_team_created ON clients(team_id, created_at DESC);

-- 11. JOB REQUIREMENTS: Job openings
-- ================================================================
CREATE TABLE job_requirements (
    requirement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(client_id) ON DELETE SET NULL,

    -- Job Information
    job_title VARCHAR(255) NOT NULL,
    job_description TEXT,
    required_skills TEXT[],
    preferred_skills TEXT[],
    experience_level VARCHAR(50),

    -- Employment Details
    employment_type VARCHAR(50) CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'contract-to-hire', 'temporary')) NOT NULL,
    location VARCHAR(255),
    remote_type VARCHAR(50) CHECK (remote_type IN ('on-site', 'remote', 'hybrid')),

    -- Compensation
    min_salary DECIMAL(12, 2),
    max_salary DECIMAL(12, 2),
    salary_currency VARCHAR(10) DEFAULT 'USD',
    bill_rate DECIMAL(12, 2),

    -- Status and Dates
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('draft', 'open', 'on-hold', 'filled', 'cancelled')) NOT NULL,
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    openings_count INTEGER DEFAULT 1,
    filled_count INTEGER DEFAULT 0,
    start_date DATE,
    end_date DATE,

    -- Metadata
    notes TEXT,

    -- Audit fields
    created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for job_requirements
CREATE INDEX idx_requirements_team_status ON job_requirements(team_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_requirements_team_created ON job_requirements(team_id, created_at DESC);
CREATE INDEX idx_requirements_client ON job_requirements(client_id);

-- 12. SUBMISSIONS: Candidate submissions to job requirements
-- ================================================================
CREATE TABLE submissions (
    submission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES job_requirements(requirement_id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(candidate_id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(vendor_id) ON DELETE SET NULL,

    -- Submission Details
    submitted_rate DECIMAL(12, 2),
    submitted_rate_currency VARCHAR(10) DEFAULT 'USD',
    availability_date DATE,

    -- Status and Workflow
    status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'screening', 'client-review', 'interview', 'offer', 'accepted', 'rejected', 'withdrawn')) NOT NULL,
    stage VARCHAR(100),

    -- Metadata
    notes TEXT,
    rejection_reason TEXT,

    -- Audit fields
    submitted_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Ensure candidate is only submitted once per requirement
    UNIQUE(team_id, requirement_id, candidate_id)
);

-- Indexes for submissions
CREATE INDEX idx_submissions_team_status ON submissions(team_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_submissions_requirement ON submissions(requirement_id);
CREATE INDEX idx_submissions_candidate ON submissions(candidate_id);
CREATE INDEX idx_submissions_vendor ON submissions(vendor_id);

-- 13. INTERVIEWS: Interview schedules and feedback
-- ================================================================
CREATE TABLE interviews (
    interview_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES submissions(submission_id) ON DELETE CASCADE,

    -- Interview Details
    interview_type VARCHAR(50) CHECK (interview_type IN ('phone-screen', 'technical', 'behavioral', 'panel', 'final', 'other')) NOT NULL,
    interview_round INTEGER DEFAULT 1,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    location VARCHAR(255),
    meeting_link TEXT,

    -- Participants
    interviewer_names TEXT[],
    interviewer_emails TEXT[],

    -- Status and Outcome
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show', 'rescheduled')) NOT NULL,
    outcome VARCHAR(50) CHECK (outcome IN ('pass', 'fail', 'strong-pass', 'strong-fail', 'pending')),

    -- Feedback
    feedback TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),

    -- Metadata
    notes TEXT,

    -- Audit fields
    created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for interviews
CREATE INDEX idx_interviews_team_status ON interviews(team_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_interviews_submission ON interviews(submission_id);
CREATE INDEX idx_interviews_scheduled ON interviews(scheduled_at) WHERE deleted_at IS NULL;

-- 14. PROJECTS: Client projects/placements
-- ================================================================
CREATE TABLE projects (
    project_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(client_id) ON DELETE SET NULL,
    submission_id UUID REFERENCES submissions(submission_id) ON DELETE SET NULL,

    -- Project Information
    project_name VARCHAR(255) NOT NULL,
    project_description TEXT,
    project_type VARCHAR(50) CHECK (project_type IN ('contract', 'full-time-placement', 'contract-to-hire', 'temporary')),

    -- Dates
    start_date DATE NOT NULL,
    end_date DATE,
    actual_end_date DATE,

    -- Financial
    bill_rate DECIMAL(12, 2),
    pay_rate DECIMAL(12, 2),
    currency VARCHAR(10) DEFAULT 'USD',

    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'on-hold', 'completed', 'cancelled')) NOT NULL,

    -- Metadata
    notes TEXT,

    -- Audit fields
    created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for projects
CREATE INDEX idx_projects_team_status ON projects(team_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_team_created ON projects(team_id, created_at DESC);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date) WHERE deleted_at IS NULL;

-- 15. TIMESHEETS: Time tracking for projects
-- ================================================================
CREATE TABLE timesheets (
    timesheet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(candidate_id) ON DELETE CASCADE,

    -- Time Period
    week_ending DATE NOT NULL,

    -- Hours
    regular_hours DECIMAL(5, 2) DEFAULT 0,
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    total_hours DECIMAL(5, 2) GENERATED ALWAYS AS (regular_hours + overtime_hours) STORED,

    -- Status and Approval
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,

    -- Metadata
    notes TEXT,

    -- Audit fields
    created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Ensure one timesheet per project/candidate/week
    UNIQUE(team_id, project_id, candidate_id, week_ending)
);

-- Indexes for timesheets
CREATE INDEX idx_timesheets_team_status ON timesheets(team_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheets_project ON timesheets(project_id);
CREATE INDEX idx_timesheets_week_ending ON timesheets(week_ending DESC);

-- 16. INVOICES: Billing and invoicing
-- ================================================================
CREATE TABLE invoices (
    invoice_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(project_id) ON DELETE SET NULL,

    -- Invoice Details
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,

    -- Amounts
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',

    -- Payment
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')) NOT NULL,
    paid_date DATE,
    payment_method VARCHAR(50),

    -- Metadata
    notes TEXT,
    terms TEXT,

    -- Audit fields
    created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Team-scoped unique invoice number
    UNIQUE(team_id, invoice_number)
);

-- Indexes for invoices
CREATE INDEX idx_invoices_team_status ON invoices(team_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE deleted_at IS NULL AND status != 'paid';

-- 17. IMMIGRATION: Immigration case tracking
-- ================================================================
CREATE TABLE immigration (
    case_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(candidate_id) ON DELETE CASCADE,

    -- Case Information
    visa_type VARCHAR(50) NOT NULL,
    petition_type VARCHAR(50),
    case_number VARCHAR(100),

    -- Dates
    filing_date DATE,
    approval_date DATE,
    expiration_date DATE,

    -- Status
    status VARCHAR(50) DEFAULT 'in-progress' CHECK (status IN ('planning', 'in-progress', 'approved', 'denied', 'withdrawn', 'expired')) NOT NULL,
    priority_date DATE,

    -- Details
    attorney_name VARCHAR(255),
    attorney_firm VARCHAR(255),
    attorney_email VARCHAR(255),

    -- Metadata
    notes TEXT,
    documents JSONB DEFAULT '[]',

    -- Audit fields
    created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for immigration
CREATE INDEX idx_immigration_team_status ON immigration(team_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_immigration_candidate ON immigration(candidate_id);
CREATE INDEX idx_immigration_expiration ON immigration(expiration_date) WHERE deleted_at IS NULL;

-- 18. NOTES: General notes/comments for entities
-- ================================================================
CREATE TABLE notes (
    note_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,

    -- Entity Reference (polymorphic)
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('candidate', 'vendor', 'client', 'requirement', 'submission', 'interview', 'project')),
    entity_id UUID NOT NULL,

    -- Note Content
    content TEXT NOT NULL,
    is_important BOOLEAN DEFAULT false,

    -- Audit fields
    created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for notes
CREATE INDEX idx_notes_team ON notes(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_entity ON notes(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_created ON notes(created_at DESC);

-- 19. ACTIVITIES: Activity log/audit trail
-- ================================================================
CREATE TABLE activities (
    activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,

    -- Activity Details
    activity_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,

    -- Action Details
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'viewed', 'exported', 'imported', 'sent', 'received')),
    description TEXT,
    changes JSONB,

    -- User
    user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(255),

    -- Metadata
    ip_address INET,
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for activities
CREATE INDEX idx_activities_team ON activities(team_id);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activities_created ON activities(created_at DESC);
CREATE INDEX idx_activities_action ON activities(action);

-- ================================================================
-- FUNCTIONS AND TRIGGERS
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_requirements_updated_at BEFORE UPDATE ON job_requirements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON interviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timesheets_updated_at BEFORE UPDATE ON timesheets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_immigration_updated_at BEFORE UPDATE ON immigration
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON TABLE teams IS 'Company/tenant container - each team represents a separate company';
COMMENT ON TABLE role_templates IS 'System-provided role templates that are cloned for each team';
COMMENT ON TABLE roles IS 'Team-specific roles cloned from templates or custom created';
COMMENT ON TABLE permissions IS 'System-wide permission definitions';
COMMENT ON TABLE template_permissions IS 'Default permissions assigned to role templates';
COMMENT ON TABLE role_permissions IS 'Team-customizable permissions for roles';
COMMENT ON TABLE users IS 'User accounts linked to Supabase auth';
COMMENT ON CONSTRAINT check_admin_team_role ON users IS 'Master admins have no team/role; regular users must have both';

-- ================================================================
-- END OF SCHEMA
-- ================================================================
