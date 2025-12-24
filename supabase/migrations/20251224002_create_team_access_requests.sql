-- Create team_access_requests table for user access request workflow
CREATE TABLE IF NOT EXISTS team_access_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company_email VARCHAR(255),
  requested_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  auth_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT
);

-- Indexes for common queries
CREATE INDEX idx_team_access_requests_team_status ON team_access_requests(requested_team_id, status);
CREATE INDEX idx_team_access_requests_email ON team_access_requests(email);
CREATE INDEX idx_team_access_requests_created ON team_access_requests(created_at DESC);

-- Unique constraint on pending requests (only one pending per email per team)
CREATE UNIQUE INDEX idx_team_access_requests_pending_unique 
  ON team_access_requests(requested_team_id, email) 
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE team_access_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow team admins to view all requests for their team
CREATE POLICY team_access_requests_select ON team_access_requests
  FOR SELECT
  USING (
    (
      requested_team_id = (SELECT team_id FROM users WHERE id = auth.uid()::text)
      AND
      COALESCE((SELECT r.is_admin FROM users u
                 JOIN roles r ON u.role_id = r.id
                 WHERE u.id = auth.uid()::text), FALSE)
    )
    OR
    (SELECT is_master_admin FROM users WHERE id = auth.uid()::text)
  );

-- Allow authenticated users to insert their own requests
CREATE POLICY team_access_requests_insert ON team_access_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text IS NOT NULL);

-- Allow team admins and system to update requests
CREATE POLICY team_access_requests_update ON team_access_requests
  FOR UPDATE
  USING (
    (
      requested_team_id = (SELECT team_id FROM users WHERE id = auth.uid()::text)
      AND
      COALESCE((SELECT r.is_admin FROM users u
                 JOIN roles r ON u.role_id = r.id
                 WHERE u.id = auth.uid()::text), FALSE)
    )
    OR
    (SELECT is_master_admin FROM users WHERE id = auth.uid()::text)
  );

-- Timestamp trigger
CREATE TRIGGER team_access_requests_updated_at BEFORE UPDATE ON team_access_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
