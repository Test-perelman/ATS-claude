-- Fix is_membership_approved function parameter reference
-- 
-- BUG FIX: The function was incorrectly using $2 parameter reference
-- instead of the named parameter 'team_id'. This caused the RLS policy
-- to fail when checking membership approval status, resulting in:
-- "User authentication required. Please log in again" error
--
-- IMPACT:
-- - Users getting "User authentication required" error on candidates page
-- - Users unable to create candidates despite being logged in
-- - All RLS policies using is_membership_approved() were failing
-- - This affected: candidates, vendors, clients, job_requirements, submissions, interviews, projects, timesheets, invoices, immigration, notes tables

-- Drop the broken function
DROP FUNCTION IF EXISTS is_membership_approved(UUID, UUID) CASCADE;

-- Recreate with correct parameter reference
CREATE FUNCTION is_membership_approved(user_id UUID, team_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_memberships
    WHERE team_memberships.user_id = user_id::TEXT
      AND team_memberships.team_id = team_id
      AND team_memberships.status = 'approved'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_membership_approved(UUID, UUID) TO authenticated, service_role;
