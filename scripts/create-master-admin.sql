-- ============================================
-- CREATE MASTER ADMIN USER
-- ============================================
-- This script helps you designate a user as Master Admin
-- Master Admin has:
-- - Access to all teams (cross-tenant access)
-- - Ability to manage roles and permissions
-- - Can create and manage Local Admins
--
-- IMPORTANT: Run fix-database-issues.sql FIRST before running this script
--
-- Run this in Supabase SQL Editor:
-- 1. Go to https://app.supabase.com
-- 2. Select your project
-- 3. Click "SQL Editor" → "New Query"
-- 4. Update the email address below to your admin user's email
-- 5. Click "Run"
-- ============================================

-- ============================================
-- OPTION 1: Set existing user as Master Admin by email
-- ============================================

-- CHANGE THIS EMAIL to your admin user's email address
DO $$
DECLARE
  admin_email TEXT := 'your-admin@example.com'; -- ⚠️ CHANGE THIS!
  admin_user_id UUID;
  admin_username TEXT;
BEGIN
  -- Find user by email
  SELECT user_id, username INTO admin_user_id, admin_username
  FROM users
  WHERE email = admin_email;

  -- Check if user exists
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Please check the email address.', admin_email;
  END IF;

  -- Set user as master admin
  UPDATE users
  SET is_master_admin = TRUE
  WHERE user_id = admin_user_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ MASTER ADMIN CREATED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User ID: %', admin_user_id;
  RAISE NOTICE 'Username: %', admin_username;
  RAISE NOTICE 'Email: %', admin_email;
  RAISE NOTICE 'is_master_admin: TRUE';
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- OPTION 2: Set existing user as Master Admin by user_id
-- ============================================

-- Uncomment and use this if you know the user_id
-- UPDATE users
-- SET is_master_admin = TRUE
-- WHERE user_id = 'your-user-id-here';

-- ============================================
-- VERIFICATION
-- ============================================

-- View all master admins
SELECT
  user_id,
  username,
  email,
  team_id,
  is_master_admin,
  status,
  created_at
FROM users
WHERE is_master_admin = TRUE;

-- ============================================
-- CREATE LOCAL ADMIN ROLE (if not exists)
-- ============================================

-- Create Local Admin role for team-level administrators
INSERT INTO roles (role_name, role_description)
VALUES ('Local Admin', 'Team administrator with team-scoped permissions')
ON CONFLICT (role_name) DO NOTHING;

-- Verify roles
SELECT role_id, role_name, role_description FROM roles;

-- ============================================
-- NEXT STEPS
-- ============================================

-- After creating your master admin:
-- 1. Log out and log back in as the master admin user
-- 2. You should now have access to all teams
-- 3. You can assign the "Local Admin" role to users within each team
-- 4. Test creating records to verify teamID errors are resolved

-- To assign Local Admin role to a user:
-- UPDATE users
-- SET role_id = (SELECT role_id FROM roles WHERE role_name = 'Local Admin')
-- WHERE email = 'local-admin@example.com';
