-- Migration: Add is_master_admin field to users table
-- This field identifies Master Admin users who have access to all teams

ALTER TABLE users ADD COLUMN is_master_admin BOOLEAN DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX idx_users_is_master_admin ON users(is_master_admin);

-- Add comment for documentation
COMMENT ON COLUMN users.is_master_admin IS 'Identifies Master Admin users with cross-team access and role configuration privileges';
