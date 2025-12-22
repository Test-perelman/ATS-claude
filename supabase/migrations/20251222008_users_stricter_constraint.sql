-- Update users table constraint to be stricter
-- Non-master users MUST have both team_id and role_id
-- This eliminates ambiguous states

-- Drop existing constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_team_consistency;

ALTER TABLE users ADD CONSTRAINT users_role_team_consistency CHECK (
  -- Master admin: no team, no role
  (is_master_admin = true AND team_id IS NULL AND role_id IS NULL)
  OR
  -- Regular user: must have both team and role
  (is_master_admin = false AND team_id IS NOT NULL AND role_id IS NOT NULL)
);
