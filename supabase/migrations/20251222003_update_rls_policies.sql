-- Update RLS policies to enforce membership status
-- Pending users are now blocked from accessing team data

-- ============================================================================
-- BUSINESS TABLES: All follow same pattern - master admin bypass + approved members only
-- ============================================================================

-- CANDIDATES
DROP POLICY IF EXISTS candidates_own_team ON candidates;
CREATE POLICY candidates_own_team ON candidates
  USING (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  )
  WITH CHECK (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  );

-- VENDORS
DROP POLICY IF EXISTS vendors_own_team ON vendors;
CREATE POLICY vendors_own_team ON vendors
  USING (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  )
  WITH CHECK (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  );

-- CLIENTS
DROP POLICY IF EXISTS clients_own_team ON clients;
CREATE POLICY clients_own_team ON clients
  USING (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  )
  WITH CHECK (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  );

-- JOB_REQUIREMENTS
DROP POLICY IF EXISTS job_requirements_own_team ON job_requirements;
CREATE POLICY job_requirements_own_team ON job_requirements
  USING (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  )
  WITH CHECK (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  );

-- SUBMISSIONS
DROP POLICY IF EXISTS submissions_own_team ON submissions;
CREATE POLICY submissions_own_team ON submissions
  USING (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  )
  WITH CHECK (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  );

-- INTERVIEWS
DROP POLICY IF EXISTS interviews_own_team ON interviews;
CREATE POLICY interviews_own_team ON interviews
  USING (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  )
  WITH CHECK (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  );

-- PROJECTS
DROP POLICY IF EXISTS projects_own_team ON projects;
CREATE POLICY projects_own_team ON projects
  USING (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  )
  WITH CHECK (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  );

-- TIMESHEETS
DROP POLICY IF EXISTS timesheets_own_team ON timesheets;
CREATE POLICY timesheets_own_team ON timesheets
  USING (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  )
  WITH CHECK (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  );

-- INVOICES
DROP POLICY IF EXISTS invoices_own_team ON invoices;
CREATE POLICY invoices_own_team ON invoices
  USING (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  )
  WITH CHECK (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  );

-- IMMIGRATION
DROP POLICY IF EXISTS immigration_own_team ON immigration;
CREATE POLICY immigration_own_team ON immigration
  USING (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  )
  WITH CHECK (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  );

-- NOTES
DROP POLICY IF EXISTS notes_own_team ON notes;
CREATE POLICY notes_own_team ON notes
  USING (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  )
  WITH CHECK (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  );

-- ============================================================================
-- SYSTEM TABLES: Require approved membership
-- ============================================================================

-- TEAMS: Only accessible to approved members (or master admin)
DROP POLICY IF EXISTS teams_own_team ON teams;
CREATE POLICY teams_own_team ON teams
  USING (
    is_master_admin(auth.uid())
    OR id IN (
      SELECT team_id FROM team_memberships
      WHERE user_id = auth.uid()::TEXT AND status = 'approved'
    )
  )
  WITH CHECK (FALSE);

-- USERS: Own profile + team members if approved admin
DROP POLICY IF EXISTS users_own_team ON users;
CREATE POLICY users_own_team ON users
  USING (
    id = auth.uid()::TEXT
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
      AND is_admin_for_team(auth.uid())
    )
  )
  WITH CHECK (id = auth.uid()::TEXT);

-- ROLES: Only accessible to approved members
DROP POLICY IF EXISTS roles_own_team ON roles;
CREATE POLICY roles_own_team ON roles
  USING (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
    )
  )
  WITH CHECK (
    is_master_admin(auth.uid())
    OR (
      team_id = get_user_team_id(auth.uid())
      AND is_membership_approved(auth.uid(), team_id)
      AND is_admin_for_team(auth.uid())
    )
  );
