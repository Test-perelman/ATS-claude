-- Backfill existing users into team_memberships as approved
-- Existing users are grandfathered in with approved status since they were already working

INSERT INTO team_memberships (user_id, team_id, status, requested_at, approved_at, approved_by)
SELECT
  u.id,
  u.team_id,
  'approved',
  u.created_at,
  u.created_at,
  NULL
FROM users u
WHERE u.team_id IS NOT NULL
  AND u.is_master_admin = false
  AND NOT EXISTS (
    SELECT 1 FROM team_memberships tm
    WHERE tm.user_id = u.id AND tm.team_id = u.team_id
  );
