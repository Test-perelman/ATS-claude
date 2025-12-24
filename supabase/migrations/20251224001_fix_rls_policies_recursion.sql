-- Drop problematic RLS policies that cause infinite recursion
DROP POLICY IF EXISTS users_master_admin ON users;
DROP POLICY IF EXISTS users_own_team ON users;
DROP POLICY IF EXISTS users_own_profile ON users;

-- Recreate functions with SECURITY DEFINER FIRST
DROP FUNCTION IF EXISTS is_master_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_team_id(TEXT) CASCADE;
DROP FUNCTION IF EXISTS is_admin_for_team(TEXT) CASCADE;

CREATE FUNCTION get_user_team_id(user_id TEXT)
RETURNS UUID AS $$
  SELECT team_id FROM users WHERE id = user_id
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE FUNCTION is_master_admin(user_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT is_master_admin FROM users WHERE id = user_id
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE FUNCTION is_admin_for_team(user_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT COALESCE((
    SELECT r.is_admin
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = user_id
  ), FALSE)
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Now recreate policies - they can call the SECURITY DEFINER functions safely
CREATE POLICY users_master_admin ON users
  USING (is_master_admin(auth.user_id()))
  WITH CHECK (is_master_admin(auth.user_id()));

CREATE POLICY users_own_team ON users
  USING (team_id = get_user_team_id(auth.user_id()))
  WITH CHECK (FALSE);

CREATE POLICY users_own_profile ON users
  USING (id = auth.user_id())
  WITH CHECK (id = auth.user_id());

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_team_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_master_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_for_team(TEXT) TO authenticated;
