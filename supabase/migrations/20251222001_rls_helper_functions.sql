-- Add RLS helper functions for v2 membership enforcement

-- Check if user is a master admin
CREATE OR REPLACE FUNCTION is_master_admin(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_master_admin FROM users WHERE id = user_id::TEXT), false)
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get user's team_id
CREATE OR REPLACE FUNCTION get_user_team_id(user_id UUID) RETURNS UUID AS $$
  SELECT team_id FROM users WHERE id = user_id::TEXT
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if user has approved membership to team
CREATE OR REPLACE FUNCTION is_membership_approved(user_id UUID, team_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_memberships
    WHERE team_memberships.user_id = user_id::TEXT
      AND team_memberships.team_id = team_id
      AND team_memberships.status = 'approved'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if user is an admin for their team
CREATE OR REPLACE FUNCTION is_admin_for_team(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = user_id::TEXT
      AND r.is_admin = true
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Grant execute permissions to authenticated users and service role
GRANT EXECUTE ON FUNCTION is_master_admin(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_team_id(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_membership_approved(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_admin_for_team(UUID) TO authenticated, service_role;
