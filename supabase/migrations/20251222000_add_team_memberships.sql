-- Add team_memberships table for v2 membership tracking
-- This table tracks user membership status in teams: pending, approved, or rejected

CREATE TABLE team_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Membership status: pending | approved | rejected
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Audit fields: when requested, who requested what role
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,

  -- Audit fields: when approved and by whom
  approved_at TIMESTAMPTZ,
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,

  -- Audit fields: when rejected and why
  rejection_reason VARCHAR(500),
  rejected_at TIMESTAMPTZ
);

-- Partial unique constraint: only one active membership per (user, team) pair
-- Rejected memberships are allowed to have duplicates (for history)
CREATE UNIQUE INDEX idx_team_memberships_active_unique
ON team_memberships(user_id, team_id)
WHERE status != 'rejected';

CREATE INDEX idx_team_memberships_user ON team_memberships(user_id);
CREATE INDEX idx_team_memberships_team ON team_memberships(team_id);
CREATE INDEX idx_team_memberships_status ON team_memberships(status);
CREATE INDEX idx_team_memberships_user_team_status ON team_memberships(user_id, team_id, status);

ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
