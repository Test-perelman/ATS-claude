-- RLS policies for team_memberships table

-- Master admins see all memberships
DROP POLICY IF EXISTS team_memberships_master_admin ON team_memberships;
CREATE POLICY team_memberships_master_admin ON team_memberships
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

-- Local admins see their team's memberships
DROP POLICY IF EXISTS team_memberships_own_team ON team_memberships;
CREATE POLICY team_memberships_own_team ON team_memberships
  USING (
    team_id = get_user_team_id(auth.uid())
    AND is_admin_for_team(auth.uid())
  )
  WITH CHECK (
    team_id = get_user_team_id(auth.uid())
    AND is_admin_for_team(auth.uid())
  );

-- Users see only their own membership
DROP POLICY IF EXISTS team_memberships_own ON team_memberships;
CREATE POLICY team_memberships_own ON team_memberships
  USING (user_id = auth.uid()::TEXT)
  WITH CHECK (FALSE);
