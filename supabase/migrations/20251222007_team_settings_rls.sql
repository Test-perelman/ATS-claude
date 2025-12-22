-- RLS policies for team_settings table

-- Anyone can see discoverable teams, members can see their team settings
CREATE POLICY team_settings_discoverable ON team_settings
  FOR SELECT
  USING (
    is_discoverable = TRUE
    OR team_id IN (
      SELECT team_id FROM team_memberships
      WHERE user_id = auth.uid()::TEXT AND status = 'approved'
    )
    OR is_master_admin(auth.uid())
  );

-- Admins can update their team's settings
CREATE POLICY team_settings_own_team_update ON team_settings
  FOR UPDATE
  USING (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_admin_for_team(auth.uid())
    )
  );
