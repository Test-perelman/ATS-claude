/**
 * Authentication Functions V2
 * Multi-tenant authentication with master admin and team signup support
 */

import { createServerClient } from './server'
import { supabase } from './client'
import type { UserWithRole, ApiResponse } from '@/types/database'
import { cloneRoleTemplatesForTeam, getLocalAdminRole } from '@/lib/utils/role-helpers'

// ================================================================
// SERVER-SIDE AUTHENTICATION FUNCTIONS
// ================================================================

/**
 * Get current authenticated user with role and team information
 * Use this in API routes and server components
 *
 * @returns UserWithRole or null if not authenticated
 */
export async function getCurrentUser(): Promise<UserWithRole | null> {
  try {
    const supabase = await createServerClient()

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return null
    }

    const { data: userData, error } = await supabase
      .from('users')
      .select(`
        user_id,
        team_id,
        role_id,
        email,
        username,
        first_name,
        last_name,
        is_master_admin,
        status,
        created_at,
        updated_at,
        last_login,
        avatar_url,
        role:roles (
          role_id,
          role_name,
          is_admin_role
        ),
        team:teams (
          team_id,
          team_name,
          company_name
        )
      `)
      .eq('user_id', authUser.id)
      .single()

    if (error || !userData) {
      return null
    }

    return userData as UserWithRole
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

/**
 * Team Sign Up - Creates a new team with first admin user
 *
 * Workflow:
 * 1. Create Supabase auth user
 * 2. Create team
 * 3. Clone all role templates for the team
 * 4. Assign user as Local Admin
 * 5. Return user + team
 *
 * @param data - Sign up data
 * @returns User and team data or error
 */
export async function teamSignUp(data: {
  email: string
  password: string
  firstName: string
  lastName: string
  companyName: string
  teamName?: string
}): Promise<ApiResponse<{ user: UserWithRole; team: any }>> {
  try {
    const supabase = await createServerClient()

    // Step 1: Create Supabase auth user
    console.log('Step 1: Creating auth user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: data.firstName,
        last_name: data.lastName,
      },
    })

    if (authError || !authData.user) {
      console.error('Auth user creation failed:', authError)
      return {
        success: false,
        error: authError?.message || 'Failed to create auth user'
      }
    }

    const userId = authData.user.id
    console.log('Auth user created:', userId)

    try {
      // Step 2: Create team
      console.log('Step 2: Creating team...')
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert({
          team_name: data.teamName || data.companyName,
          company_name: data.companyName,
          subscription_tier: 'free',
          is_active: true,
        })
        .select()
        .single()

      if (teamError || !teamData) {
        console.error('Team creation failed:', teamError)
        throw new Error(teamError?.message || 'Failed to create team')
      }

      const teamId = teamData.team_id
      console.log('Team created:', teamId)

      // Step 3: Clone all role templates for this team
      console.log('Step 3: Cloning role templates...')
      const roleIds = await cloneRoleTemplatesForTeam(teamId)
      console.log(`Created ${roleIds.length} roles for team`)

      // Step 4: Get the Local Admin role
      console.log('Step 4: Getting Local Admin role...')
      const localAdminRole = await getLocalAdminRole(teamId)

      if (!localAdminRole) {
        throw new Error('Local Admin role not found after template cloning')
      }

      console.log('Local Admin role ID:', localAdminRole.role_id)

      // Step 5: Create user record with team and Local Admin role
      console.log('Step 5: Creating user record...')
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          user_id: userId,
          email: data.email,
          username: data.email.split('@')[0],
          first_name: data.firstName,
          last_name: data.lastName,
          team_id: teamId,
          role_id: localAdminRole.role_id,
          is_master_admin: false,
          status: 'active',
        })
        .select(`
          user_id,
          team_id,
          role_id,
          email,
          username,
          first_name,
          last_name,
          is_master_admin,
          status,
          created_at,
          updated_at,
          last_login,
          avatar_url,
          role:roles (
            role_id,
            role_name,
            is_admin_role
          ),
          team:teams (
            team_id,
            team_name,
            company_name
          )
        `)
        .single()

      if (userError || !userData) {
        console.error('User record creation failed:', userError)
        throw new Error(userError?.message || 'Failed to create user')
      }

      console.log('User record created successfully')

      return {
        success: true,
        data: {
          user: userData as UserWithRole,
          team: teamData,
        },
      }
    } catch (setupError) {
      // Cleanup: Delete auth user if setup fails
      console.error('Setup failed, cleaning up auth user:', setupError)
      await supabase.auth.admin.deleteUser(userId)
      throw setupError
    }
  } catch (error) {
    console.error('Team signup error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Create Master Admin - Creates a system administrator
 * Master admins have no team_id and can access all teams
 *
 * @param data - Admin creation data
 * @returns Created master admin user or error
 */
export async function createMasterAdmin(data: {
  email: string
  password: string
  firstName: string
  lastName: string
}): Promise<ApiResponse<UserWithRole>> {
  try {
    const supabase = await createServerClient()

    // Step 1: Create Supabase auth user
    console.log('Creating master admin auth user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        first_name: data.firstName,
        last_name: data.lastName,
      },
    })

    if (authError || !authData.user) {
      console.error('Auth user creation failed:', authError)
      return {
        success: false,
        error: authError?.message || 'Failed to create auth user',
      }
    }

    const userId = authData.user.id
    console.log('Auth user created:', userId)

    try {
      // Step 2: Create user record as master admin
      // team_id = NULL, role_id = NULL, is_master_admin = true
      console.log('Creating master admin user record...')
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          user_id: userId,
          email: data.email,
          username: data.email.split('@')[0],
          first_name: data.firstName,
          last_name: data.lastName,
          team_id: null,
          role_id: null,
          is_master_admin: true,
          status: 'active',
        })
        .select(`
          user_id,
          team_id,
          role_id,
          email,
          username,
          first_name,
          last_name,
          is_master_admin,
          status,
          created_at,
          updated_at,
          last_login,
          avatar_url
        `)
        .single()

      if (userError || !userData) {
        console.error('User record creation failed:', userError)
        throw new Error(userError?.message || 'Failed to create master admin user')
      }

      console.log('Master admin created successfully')

      return {
        success: true,
        data: userData as UserWithRole,
      }
    } catch (setupError) {
      // Cleanup: Delete auth user if setup fails
      console.error('Setup failed, cleaning up auth user:', setupError)
      await supabase.auth.admin.deleteUser(userId)
      throw setupError
    }
  } catch (error) {
    console.error('Create master admin error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

// ================================================================
// CLIENT-SIDE AUTHENTICATION FUNCTIONS
// ================================================================

/**
 * Sign in with email and password
 * Use this in client components
 *
 * @param email - User email
 * @param password - User password
 * @returns User data or error
 */
export async function signIn(
  email: string,
  password: string
): Promise<ApiResponse<{ user: UserWithRole }>> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Invalid credentials',
      }
    }

    console.log('Auth successful, userId:', authData.user.id)

    // Get user record with team and role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        user_id,
        team_id,
        role_id,
        email,
        username,
        first_name,
        last_name,
        is_master_admin,
        status,
        created_at,
        updated_at,
        last_login,
        avatar_url,
        role:roles (
          role_id,
          role_name,
          is_admin_role
        ),
        team:teams (
          team_id,
          team_name,
          company_name
        )
      `)
      .eq('user_id', authData.user.id)
      .single()

    if (userError || !userData) {
      return {
        success: false,
        error: userError?.message || 'Failed to fetch user data',
      }
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', authData.user.id)

    return {
      success: true,
      data: {
        user: userData as UserWithRole,
      },
    }
  } catch (error) {
    console.error('Sign in error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }
    return { success: true }
  } catch (error) {
    console.error('Sign out error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Get current user's team_id
 * Use this for quick team ID lookups
 */
export async function getCurrentUserTeamId(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.team_id || null
}

/**
 * Check if current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    first_name?: string
    last_name?: string
    username?: string
    avatar_url?: string
  }
): Promise<ApiResponse<UserWithRole>> {
  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('user_id', userId)
      .select(`
        user_id,
        team_id,
        role_id,
        email,
        username,
        first_name,
        last_name,
        is_master_admin,
        status,
        created_at,
        updated_at,
        last_login,
        avatar_url,
        role:roles (
          role_id,
          role_name,
          is_admin_role
        ),
        team:teams (
          team_id,
          team_name,
          company_name
        )
      `)
      .single()

    if (error || !data) {
      return {
        success: false,
        error: error?.message || 'Failed to update profile',
      }
    }

    return {
      success: true,
      data: data as UserWithRole,
    }
  } catch (error) {
    console.error('Update profile error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}
