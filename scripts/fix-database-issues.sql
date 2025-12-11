-- ============================================
-- DATABASE FIXES FOR MULTI-TENANT ARCHITECTURE
-- ============================================
-- This script fixes two critical issues:
-- 1. Missing is_master_admin column in users table
-- 2. team_id NOT NULL constraint preventing access request flow
--
-- Run this in Supabase SQL Editor:
-- 1. Go to https://app.supabase.com
-- 2. Select your project
-- 3. Click "SQL Editor" → "New Query"
-- 4. Copy and paste this entire file
-- 5. Click "Run"
-- ============================================

-- ============================================
-- FIX #1: Add is_master_admin column
-- ============================================

-- Add is_master_admin column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_master_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_master_admin BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added is_master_admin column to users table';
  ELSE
    RAISE NOTICE 'is_master_admin column already exists';
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_is_master_admin ON users(is_master_admin);

-- Add comment for documentation
COMMENT ON COLUMN users.is_master_admin IS 'Identifies Master Admin users with cross-team access and role configuration privileges';

-- ============================================
-- FIX #2: Make team_id nullable
-- ============================================

-- Drop NOT NULL constraint if it exists (to support access request flow)
DO $$
BEGIN
  -- Check if NOT NULL constraint exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'team_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE users ALTER COLUMN team_id DROP NOT NULL;
    RAISE NOTICE 'Removed NOT NULL constraint from team_id column';
  ELSE
    RAISE NOTICE 'team_id column is already nullable';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN users.team_id IS 'Team association (nullable to support access request flow where users login before team assignment)';

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the changes
DO $$
DECLARE
  has_master_admin BOOLEAN;
  team_id_nullable BOOLEAN;
BEGIN
  -- Check is_master_admin column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_master_admin'
  ) INTO has_master_admin;

  -- Check team_id is nullable
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'team_id'
      AND is_nullable = 'YES'
  ) INTO team_id_nullable;

  -- Report results
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION RESULTS:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'is_master_admin column exists: %', has_master_admin;
  RAISE NOTICE 'team_id is nullable: %', team_id_nullable;

  IF has_master_admin AND team_id_nullable THEN
    RAISE NOTICE '✓ ALL FIXES APPLIED SUCCESSFULLY';
  ELSE
    RAISE WARNING '✗ SOME FIXES FAILED - PLEASE CHECK ERRORS ABOVE';
  END IF;
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- NEXT STEPS
-- ============================================

-- After running this script, you need to:
-- 1. Designate a master admin user (see create-master-admin.sql)
-- 2. Verify your application can create records without teamID errors
-- 3. Test the Local Admin role assignment

-- To check current users and their admin status:
-- SELECT user_id, username, email, team_id, is_master_admin, status FROM users;
