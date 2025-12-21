-- FIX RLS POLICIES: Change user_id to id to match actual schema
-- The users table has column "id", not "user_id"

-- Drop existing helper functions that use wrong column name
DROP FUNCTION IF EXISTS public._rls_current_user_id() CASCADE;
DROP FUNCTION IF EXISTS public._rls_current_user_team_id() CASCADE;
DROP FUNCTION IF EXISTS public._rls_is_master_admin() CASCADE;

-- Recreate with correct column name (users.id instead of users.user_id)
CREATE OR REPLACE FUNCTION public._rls_current_user_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public._rls_current_user_team_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM users WHERE id = auth.uid()::text LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public._rls_is_master_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_master_admin, false) FROM users WHERE id = auth.uid()::text LIMIT 1;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public._rls_current_user_id() TO public;
GRANT EXECUTE ON FUNCTION public._rls_current_user_team_id() TO public;
GRANT EXECUTE ON FUNCTION public._rls_is_master_admin() TO public;

-- Update users table policies to use correct column
DROP POLICY IF EXISTS users_select_policy ON users;
DROP POLICY IF EXISTS users_insert_policy ON users;
DROP POLICY IF EXISTS users_update_policy ON users;
DROP POLICY IF EXISTS users_delete_policy ON users;

CREATE POLICY users_select_policy ON users FOR SELECT
  USING (id = public._rls_current_user_id() OR public._rls_is_master_admin() OR team_id = public._rls_current_user_team_id());

CREATE POLICY users_insert_policy ON users FOR INSERT
  WITH CHECK (public._rls_is_master_admin() OR team_id = public._rls_current_user_team_id() OR id = public._rls_current_user_id());

CREATE POLICY users_update_policy ON users FOR UPDATE
  USING (id = public._rls_current_user_id() OR public._rls_is_master_admin() OR team_id = public._rls_current_user_team_id());

CREATE POLICY users_delete_policy ON users FOR DELETE
  USING (public._rls_is_master_admin() OR team_id = public._rls_current_user_team_id());
