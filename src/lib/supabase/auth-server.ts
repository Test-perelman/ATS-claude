/**
 * Server-Side Authentication Functions
 * Use these functions only in Server Components, API Routes, and Server Actions
 */

import { createServerClient, createAdminClient } from './server'
import type { UserWithRole, ApiResponse } from '@/types/database'
import { cloneRoleTemplatesForTeam, getLocalAdminRole } from '@/lib/utils/role-helpers'

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
    // Use admin client to bypass RLS for signup operations
    const supabase = await createAdminClient()
    console.log('Admin client created with service role key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

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
      // Step 2: Create team using REST API directly
      console.log('Step 2: Creating team...')
      const teamResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/teams`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            team_name: data.teamName || data.companyName,
            company_name: data.companyName,
            subscription_tier: 'free',
            is_active: true,
          })
        }
      )

      if (!teamResponse.ok) {
        const error = await teamResponse.text()
        console.error('Team creation failed:', error)
        throw new Error(`Failed to create team: ${error}`)
      }

      const teamData = (await teamResponse.json())[0]
      if (!teamData) {
        throw new Error('Team creation returned no data')
      }

      const teamId = (teamData as any).team_id
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

      console.log('Local Admin role ID:', (localAdminRole as any).role_id)

      // Step 5: Create user record using REST API directly
      console.log('Step 5: Creating user record...')
      const userResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?select=*`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            user_id: userId,
            email: data.email,
            username: data.email.split('@')[0],
            first_name: data.firstName,
            last_name: data.lastName,
            team_id: teamId,
            role_id: (localAdminRole as any).role_id,
            is_master_admin: false,
            status: 'active',
          })
        }
      )

      if (!userResponse.ok) {
        const error = await userResponse.text()
        console.error('User record creation failed:', error)
        throw new Error(`Failed to create user: ${error}`)
      }

      const userResponseData = await userResponse.json()
      const userData = Array.isArray(userResponseData) ? userResponseData[0] : userResponseData

      if (!userData) {
        throw new Error('User creation returned no data')
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
    // Use admin client to bypass RLS for master admin creation
    const supabase = await createAdminClient()

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
        } as any)
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

    const { data, error } = await (supabase as any)
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

/**
 * Request team access - Create a team access request
 * Used when users want to join an existing team
 *
 * @param data - Access request data
 * @returns Access request or error
 */
export async function requestTeamAccess(data: {
  email: string
  firstName: string
  lastName: string
  companyEmail: string
  reason?: string
  requestedTeamId?: string
}): Promise<ApiResponse<{ request: any }>> {
  try {
    const supabase = await createServerClient()

    // Create the access request
    const { data: requestData, error: requestError } = await supabase
      .from('team_access_requests')
      .insert({
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        company_email: data.companyEmail,
        reason: data.reason || null,
        requested_team_id: data.requestedTeamId || null,
        status: 'pending',
      } as any)
      .select()
      .single()

    if (requestError || !requestData) {
      console.error('Failed to create access request:', requestError)
      return {
        success: false,
        error: requestError?.message || 'Failed to create access request',
      }
    }

    return {
      success: true,
      data: {
        request: requestData,
      },
    }
  } catch (error) {
    console.error('Request team access error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Admin Sign Up - Alias for teamSignUp
 * Creates a new team with first admin user (same as teamSignUp)
 *
 * @param data - Sign up data
 * @returns User and team data or error
 */
export async function adminSignUp(data: {
  email: string
  password: string
  firstName: string
  lastName: string
  companyName: string
  teamName?: string
  subscriptionTier?: string
}): Promise<ApiResponse<{ user: UserWithRole; team: any }>> {
  // Call teamSignUp without subscriptionTier (not part of teamSignUp signature)
  return teamSignUp({
    email: data.email,
    password: data.password,
    firstName: data.firstName,
    lastName: data.lastName,
    companyName: data.companyName,
    teamName: data.teamName,
  })
}
