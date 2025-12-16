-- JWT Claims + Auth Triggers
-- Automatically sync auth.users with public.users
-- Add custom claims to JWT token

-- ============================================================================
-- FUNCTION: Create user in public.users on auth.users signup
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_auth_user_created()
RETURNS TRIGGER AS $$
DECLARE
  team_id UUID;
  role_id UUID;
BEGIN
  -- For signup: create new team and default role
  INSERT INTO teams (name) VALUES (NEW.email)
  RETURNING id INTO team_id;

  INSERT INTO roles (team_id, name, is_admin)
  VALUES (team_id, 'owner', TRUE)
  RETURNING id INTO role_id;

  -- Insert public.users record
  INSERT INTO users (id, email, team_id, role_id, is_master_admin)
  VALUES (NEW.id, NEW.email, team_id, role_id, FALSE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only execute on signup, not on password reset/other events
CREATE TRIGGER auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.confirmed_at IS NULL)
  EXECUTE FUNCTION handle_auth_user_created();

-- ============================================================================
-- FUNCTION: Get JWT claims for user
-- Called by Supabase to add claims to token
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_jwt_claims(user_id TEXT)
RETURNS JSON AS $$
DECLARE
  user_data RECORD;
  permissions_array TEXT[];
BEGIN
  SELECT u.id, u.email, u.team_id, u.role_id, u.is_master_admin, r.is_admin
  INTO user_data
  FROM users u
  LEFT JOIN roles r ON u.role_id = r.id
  WHERE u.id = user_id;

  IF user_data IS NULL THEN
    RETURN NULL;
  END IF;

  -- Collect permissions for role
  SELECT ARRAY_AGG(p.key)
  INTO permissions_array
  FROM role_permissions rp
  JOIN permissions p ON rp.permission_id = p.id
  WHERE rp.role_id = user_data.role_id;

  RETURN JSON_BUILD_OBJECT(
    'sub', user_data.id,
    'email', user_data.email,
    'team_id', user_data.team_id,
    'role_id', user_data.role_id,
    'is_master_admin', user_data.is_master_admin,
    'is_admin', COALESCE(user_data.is_admin, FALSE),
    'permissions', COALESCE(permissions_array, ARRAY[]::TEXT[])
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- HELPER: Check if user is admin for their team (or master admin)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin_for_team(user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if master admin
  RETURN (
    SELECT is_master_admin FROM users WHERE id = user_id
  ) OR EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = user_id AND r.is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- HELPER: Check if user has permission
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_permission(user_id TEXT, permission_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_is_master_admin BOOLEAN;
BEGIN
  -- Check if master admin first
  SELECT is_master_admin INTO user_is_master_admin FROM users WHERE id = user_id;

  IF user_is_master_admin THEN
    RETURN TRUE;
  END IF;

  -- Check if role has permission
  RETURN EXISTS (
    SELECT 1 FROM users u
    JOIN role_permissions rp ON rp.role_id = u.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE u.id = user_id AND p.key = permission_key
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- SUPABASE CONFIG INSTRUCTIONS
-- ============================================================================

-- After running this script:
--
-- 1. Go to Supabase Dashboard > Project Settings > Database
-- 2. Under "Custom Claims" section, add:
--    Name: auth_claims
--    SQL Function: public.get_user_jwt_claims
--    Parameter: auth.uid()
--
-- 3. This will automatically include custom claims in every JWT token
-- 4. Claims can be accessed in Next.js via: jwt.user_metadata or decoded token
