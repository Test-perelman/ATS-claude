-- Clean Auth + RBAC + Multi-Tenant Schema
-- Based on Supabase + PostgreSQL best practices

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TEAMS: Multi-tenant company container
-- ============================================================================
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_created ON teams(created_at DESC);

-- ============================================================================
-- PERMISSIONS: System-wide permission catalog
-- ============================================================================
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  module VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_permissions_key ON permissions(key);
CREATE INDEX idx_permissions_module ON permissions(module);

-- ============================================================================
-- ROLES: Team-scoped roles (master admins have global roles)
-- ============================================================================
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, name)
);

CREATE INDEX idx_roles_team ON roles(team_id);
CREATE INDEX idx_roles_is_admin ON roles(is_admin) WHERE is_admin = TRUE;

-- ============================================================================
-- ROLE_PERMISSIONS: Map roles to permissions
-- ============================================================================
CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);

-- ============================================================================
-- USERS: Public user accounts (linked to auth.users)
-- ============================================================================
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  is_master_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT users_role_team_consistency CHECK (
    (is_master_admin = true AND team_id IS NULL AND role_id IS NULL)
    OR
    (is_master_admin = false AND ((team_id IS NOT NULL AND role_id IS NOT NULL) OR (team_id IS NULL AND role_id IS NULL)))
  )
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_team ON users(team_id);
CREATE INDEX idx_users_is_master ON users(is_master_admin) WHERE is_master_admin = TRUE;

-- ============================================================================
-- BUSINESS TABLES: All follow multi-tenant pattern
-- ============================================================================

CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  location VARCHAR(255),
  current_title VARCHAR(255),
  current_employer VARCHAR(255),
  skills TEXT[],
  experience_years INTEGER,
  status VARCHAR(50) DEFAULT 'new',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, email)
);

CREATE INDEX idx_candidates_team_status ON candidates(team_id, status);
CREATE INDEX idx_candidates_email ON candidates(email);

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, email)
);

CREATE INDEX idx_vendors_team_status ON vendors(team_id, status);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, name)
);

CREATE INDEX idx_clients_team_status ON clients(team_id, status);

CREATE TABLE job_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'open',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_requirements_team_status ON job_requirements(team_id, status);

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES job_requirements(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'submitted',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, requirement_id, candidate_id)
);

CREATE INDEX idx_submissions_team_status ON submissions(team_id, status);

CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled',
  outcome VARCHAR(50),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interviews_team_status ON interviews(team_id, status);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_team_status ON projects(team_id, status);

CREATE TABLE timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  week_ending DATE NOT NULL,
  hours DECIMAL(5, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, project_id, candidate_id, week_ending)
);

CREATE INDEX idx_timesheets_team_status ON timesheets(team_id, status);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  number VARCHAR(50) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  due_date DATE,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, number)
);

CREATE INDEX idx_invoices_team_status ON invoices(team_id, status);

CREATE TABLE immigration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  visa_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'in-progress',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_immigration_team_status ON immigration(team_id, status);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_team_entity ON notes(team_id, entity_type, entity_id);

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER candidates_updated_at BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER job_requirements_updated_at BEFORE UPDATE ON job_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER submissions_updated_at BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER interviews_updated_at BEFORE UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER timesheets_updated_at BEFORE UPDATE ON timesheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER immigration_updated_at BEFORE UPDATE ON immigration
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
