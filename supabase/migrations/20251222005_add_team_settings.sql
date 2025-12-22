-- Add team_settings table for team configuration
-- Controls visibility, discoverability, and metadata about teams

CREATE TABLE team_settings (
  team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  is_discoverable BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_settings_discoverable ON team_settings(is_discoverable);

ALTER TABLE team_settings ENABLE ROW LEVEL SECURITY;
