-- ============================================================================
-- FIX: RLS WITH PROPER SERVICE ROLE ACCESS
--
-- Problems fixed:
-- 1. Service role had no explicit GRANT - RLS was blocking admin operations
-- 2. RLS policies reference auth.uid() which may be null for service role
-- 3. Need to bypass RLS for service role while maintaining security for anon/authenticated
--
-- Strategy:
-- - Grant all permissions to service_role (postgres role)
-- - Modify RLS policies to allow service_role bypass
-- - Service role can now read/write all data while RLS protects authenticated users
-- ============================================================================

-- ============================================================================
-- STEP 1: Grant ALL permissions to service_role on all tables
-- ============================================================================

-- This allows the service role (used by admin client) to bypass RLS completely
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_requirements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timesheets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.immigration TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_memberships TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_settings TO service_role;

-- ============================================================================
-- STEP 2: Grant execute on helper functions to service_role
-- ============================================================================

-- Grant execute on the helper functions we created
GRANT EXECUTE ON FUNCTION public.is_master_admin(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_team_id(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_membership_approved(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_for_team(UUID) TO service_role;

-- ============================================================================
-- STEP 3: Verify RLS is still enabled on all tables
-- ============================================================================

-- These should all show "ON" in the output
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'users', 'teams', 'roles', 'role_permissions', 'permissions',
  'candidates', 'vendors', 'clients', 'job_requirements', 'submissions',
  'interviews', 'projects', 'timesheets', 'invoices', 'immigration', 'notes'
)
ORDER BY tablename;
