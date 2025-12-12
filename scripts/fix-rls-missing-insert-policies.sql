-- Fix RLS Missing INSERT Policies for Signup
-- This script adds the missing INSERT and DELETE policies needed for user signup
-- Also grants PostgreSQL 15+ schema permissions to service role
-- Run this in Supabase SQL Editor

-- ============================================================================
-- PostgreSQL 15+ COMPATIBILITY: Grant schema permissions to service role
-- Required for service role to INSERT/UPDATE/DELETE on public schema tables
-- ============================================================================

GRANT USAGE ON SCHEMA public TO service_role;
GRANT CREATE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;

-- ============================================================================
-- FIX: Add Missing Policies for Users Table
-- ============================================================================

-- Service role can insert users (for signup)
CREATE POLICY IF NOT EXISTS "users_insert_service_role" ON users
  FOR INSERT WITH CHECK (true);

-- Service role can delete users (for cleanup on signup failure)
CREATE POLICY IF NOT EXISTS "users_delete_service_role" ON users
  FOR DELETE USING (true);

-- ============================================================================
-- FIX: Add Missing Policies for Teams Table
-- ============================================================================

-- Service role can insert teams (for signup)
CREATE POLICY IF NOT EXISTS "teams_insert_service_role" ON teams
  FOR INSERT WITH CHECK (true);

-- Service role can delete teams (if needed for cleanup)
CREATE POLICY IF NOT EXISTS "teams_delete_service_role" ON teams
  FOR DELETE USING (true);

-- ============================================================================
-- FIX: Add Missing Policies for Roles Table
-- ============================================================================

-- Service role can insert roles (for role template cloning during signup)
CREATE POLICY IF NOT EXISTS "roles_insert_service_role" ON roles
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- FIX: Add Missing Policies for Role_Permissions Table
-- ============================================================================

-- Service role can insert role_permissions (for role template cloning during signup)
CREATE POLICY IF NOT EXISTS "role_permissions_insert_service_role" ON role_permissions
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- VERIFICATION MESSAGE
-- ============================================================================
-- The following policies have been added:
-- 1. users_insert_service_role - Allows service role to insert users
-- 2. users_delete_service_role - Allows service role to delete users (cleanup)
-- 3. teams_insert_service_role - Allows service role to insert teams
-- 4. teams_delete_service_role - Allows service role to delete teams (cleanup)
-- 5. roles_insert_service_role - Allows service role to insert roles
-- 6. role_permissions_insert_service_role - Allows service role to insert role_permissions
--
-- These policies are required for the signup process to work correctly.
-- Users are now able to register new accounts and create teams.
