-- ============================================================================
-- AUTH TRIGGER FIX: Ensure trigger can insert during signup
-- This trigger MUST work under SECURITY DEFINER to bypass RLS during signup
-- ============================================================================

-- Drop old trigger if it has bugs
DROP TRIGGER IF EXISTS auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_auth_user_created() CASCADE;

-- ============================================================================
-- Create fixed trigger function
-- SECURITY DEFINER allows bypass of RLS during trigger execution
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER AS $$
DECLARE
  team_id UUID;
  role_id UUID;
BEGIN
  -- Only execute on signup (when email is not yet confirmed)
  -- Skip password resets and other auth events
  IF NEW.confirmed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    -- Step 1: Create a new team for this user
    INSERT INTO public.teams (name)
    VALUES (NEW.email)
    RETURNING id INTO team_id;

    -- Step 2: Create default "owner" role for the team
    INSERT INTO public.roles (team_id, name, is_admin)
    VALUES (team_id, 'owner', TRUE)
    RETURNING id INTO role_id;

    -- Step 3: Insert user record in public.users
    -- Note: NEW.id is UUID, must cast to TEXT for users.id column
    INSERT INTO public.users (
      id,
      email,
      team_id,
      role_id,
      is_master_admin
    ) VALUES (
      NEW.id::TEXT,
      NEW.email,
      team_id,
      role_id,
      FALSE
    );

    RETURN NEW;

  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail - auth user was created, just not the app record
    RAISE WARNING 'handle_auth_user_created failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger: fires AFTER INSERT on auth.users
CREATE TRIGGER auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_created();

-- ============================================================================
-- NOTES:
-- 1. Trigger runs with SECURITY DEFINER - uses function owner's permissions
-- 2. Service role key can execute trigger, which inserts into public.users
-- 3. RLS policies are evaluated during trigger, but _rls_is_master_admin()
--    will return FALSE (not yet a user), so policies must allow INSERT anyway
-- 4. The users_insert_on_signup policy allows this:
--    WITH CHECK (is_master_admin OR id = _rls_current_user_id())
--    During trigger, id = NEW.id which equals current_user_id() for signup
-- ============================================================================
