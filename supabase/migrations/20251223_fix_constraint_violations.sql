-- ============================================================================
-- Fix Constraint Violations
-- ============================================================================
--
-- ISSUE: Some users in public.users have is_master_admin=false, team_id=NULL, role_id=NULL
-- This violates the user_role_check constraint which requires:
-- (is_master_admin=true AND team_id IS NULL AND role_id IS NULL) OR
-- (is_master_admin=false AND team_id IS NOT NULL AND role_id IS NOT NULL)
--
-- FIX: Update all users with NULL team_id/role_id to be master admins
-- ============================================================================

UPDATE public.users
SET is_master_admin = true
WHERE team_id IS NULL
  AND role_id IS NULL
  AND is_master_admin = false;

-- Log the changes
DO $$
DECLARE
  fixed_count INT;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM public.users
  WHERE is_master_admin = true AND team_id IS NULL AND role_id IS NULL;

  RAISE NOTICE 'Fixed constraint violations: % users are now master admins with NULL team/role', fixed_count;
END $$;
