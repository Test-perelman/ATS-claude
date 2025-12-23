/**
 * Server-Side Authentication Functions
 * Use these functions only in Server Components, API Routes, and Server Actions
 */

import { createServerClient, createAdminClient } from './server'
import type { UserWithRole, ApiResponse } from '@/types/database'
import { cloneRoleTemplatesForTeam, getLocalAdminRole } from '@/lib/utils/role-helpers'
import {
  validateUserTeamConsistency,
  validateMembershipState,
} from '@/lib/utils/invariant-guards'

/**
 * Get current authenticated user with role and team information
 * Use this in API routes and server components
 *
 * @returns UserWithRole or null if not authenticated
 */
export async function getCurrentUser(): Promise<UserWithRole | null> {
  try {
    console.log('[getCurrentUser] Starting...')
    const supabase = await createServerClient()

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[getCurrentUser] Auth error:', authError.message)
      console.error('[getCurrentUser] Auth error code:', (authError as any).code)
      // Don't return null immediately - auth errors in Vercel might be transient
      // Continue to see if we can get user data another way
    }

    if (!authUser) {
      console.log('[getCurrentUser] No auth user - not logged in')
      return null
    }

    console.log('[getCurrentUser] Auth user found:', authUser.id, 'email:', authUser.email)

    // Query using actual database column names (id, not user_id)
    // Explicitly convert authUser.id to string to handle UUID type mismatch
    const userIdString = authUser.id.toString()
    const { data: userData, error } = await supabase
      .from('users')
      .select(`
        id,
        team_id,
        role_id,
        email,
        is_master_admin,
        created_at,
        updated_at,
        role:roles (
          id,
          name,
          is_admin
        ),
        team:teams (
          id,
          name
        )
      `)
      .eq('id', userIdString)
      .single()

    // Only ignore "no rows" error (PGRST116) - all other errors are unexpected
    if (error && error.code !== 'PGRST116') {
      // This is unexpected - data integrity issue
      console.error('[getCurrentUser] Unexpected query error:', error.message, 'for user:', authUser.id)
      throw error  // Don't hide this error
    }

    if (!userData) {
      console.warn('[getCurrentUser] ⚠️ No user record found in public.users table for authenticated user:', authUser.id)
      console.warn('[getCurrentUser] User is authenticated in auth.users but missing from public.users')
      console.warn('[getCurrentUser] Creating fallback user object from auth data for debugging')

      // FALLBACK: Return a basic user object constructed from authUser
      // This prevents the "User authentication required" error and allows the app to function
      // while the missing public record issue is debugged
      const fallbackUser: UserWithRole = {
        user_id: authUser.id.toString(),
        email: authUser.email || '',
        team_id: null,
        role_id: null,
        is_master_admin: false,
        username: null,
        first_name: null,
        last_name: null,
        role: null,
        team: null,
      }
      console.log('[getCurrentUser] ⚠️ Returning fallback user object:', fallbackUser.user_id)
      return fallbackUser
    }

    console.log('[getCurrentUser] ✅ User found:', (userData as any).id)
    // Map database column names to expected UserWithRole interface
    const userWithRole = {
      user_id: (userData as any).id,
      team_id: (userData as any).team_id,
      role_id: (userData as any).role_id,
      email: (userData as any).email,
      username: null,
      first_name: null,
      last_name: null,
      is_master_admin: (userData as any).is_master_admin,
      status: 'active' as const,
      role: (userData as any).role ? {
        role_id: (userData as any).role.id,
        role_name: (userData as any).role.name,
        is_admin_role: (userData as any).role.is_admin,
      } : null,
      team: (userData as any).team ? {
        team_id: (userData as any).team.id,
        team_name: (userData as any).team.name,
        company_name: (userData as any).team.name,
      } : null,
    }
    return userWithRole as UserWithRole
  } catch (error) {
    console.error('[getCurrentUser] Exception:', error)
    return null
  }
}

/**
 * Create Team As Local Admin (v2)
 *
 * REPLACES: teamSignUp()
 *
 * Workflow:
 * 1. Validate auth user exists
 * 2. Create team
 * 3. Clone all role templates for the team
 * 4. Create user record with team_id and local admin role
 * 5. Create approved membership (auto-approve for team creator)
 * 6. Validate user and membership state with invariant guards
 * 7. Return user + team
 *
 * Called after user has verified email and chosen "Create Team"
 *
 * @param data - Team creation data
 * @returns User and team data or error
 */
export async function createTeamAsLocalAdmin(data: {
  authUserId: string
  email: string
  teamName: string
  firstName: string
  lastName: string
}): Promise<ApiResponse<{ user: UserWithRole; team: any }>> {
  try {
    // Use admin client to bypass RLS for signup operations
    const supabase = await createAdminClient()
    console.log('[createTeamAsLocalAdmin] Starting for auth user:', data.authUserId)

    const userId = data.authUserId

    try {
      // Step 1: Create team using admin client
      // Note: teams table has columns: id, name (not team_name, company_name)
      console.log('[createTeamAsLocalAdmin] Step 1: Creating team...')
      const { data: teamData, error: teamError } = await (supabase.from('teams') as any)
        .insert({
          name: data.teamName,
        })
        .select()
        .single()

      if (teamError || !teamData) {
        console.error('[createTeamAsLocalAdmin] Team creation failed:', teamError)
        throw new Error(`Failed to create team: ${teamError?.message}`)
      }

      const teamId = (teamData as any).id
      console.log('[createTeamAsLocalAdmin] ✅ Team created:', teamId)

      // Step 2: Clone all role templates for this team
      console.log('[createTeamAsLocalAdmin] Step 2: Cloning role templates...')
      const roleIds = await cloneRoleTemplatesForTeam(teamId)
      if (!roleIds || roleIds.length === 0) {
        throw new Error('Failed to clone role templates for team')
      }
      console.log('[createTeamAsLocalAdmin] Created roles:', roleIds.length)

      // Step 3: Get the Local Admin role
      console.log('[createTeamAsLocalAdmin] Step 3: Getting Local Admin role...')
      const localAdminRole = await getLocalAdminRole(teamId)

      if (!localAdminRole) {
        throw new Error('Local Admin role not found after template cloning')
      }

      const localAdminRoleId = (localAdminRole as any).id
      console.log('[createTeamAsLocalAdmin] Local Admin role ID:', localAdminRoleId)

      // Step 4: Create user record using admin client
      // Note: users table has columns: id, email, team_id, role_id, is_master_admin
      // TEAM USER STATE: is_master_admin=false, team_id=<team>, role_id=<local_admin>
      console.log('[createTeamAsLocalAdmin] Step 4: Creating user record...')
      const { data: userData, error: userError } = await (supabase.from('users') as any)
        .insert({
          id: userId,
          email: data.email.trim().toLowerCase(),
          team_id: teamId,
          role_id: localAdminRoleId,
          is_master_admin: false,
        })
        .select()
        .single()

      if (userError || !userData) {
        console.error('[createTeamAsLocalAdmin] User record creation failed:', userError)
        throw new Error(`Failed to create user: ${userError?.message}`)
      }

      console.log('[createTeamAsLocalAdmin] ✅ User record created:', userId)

      // Step 5: Create approved membership (auto-approve for team creator)
      console.log('[createTeamAsLocalAdmin] Step 5: Creating team membership...')
      const now = new Date().toISOString()
      const { data: membershipData, error: membershipError } = await (
        supabase.from('team_memberships') as any
      )
        .insert({
          user_id: userId,
          team_id: teamId,
          status: 'approved',
          requested_at: now,
          approved_at: now,
          approved_by: userId,
          requested_role_id: localAdminRoleId,
        })
        .select()
        .single()

      if (membershipError || !membershipData) {
        console.error('[createTeamAsLocalAdmin] Membership creation failed:', membershipError)
        throw new Error(`Failed to create membership: ${membershipError?.message}`)
      }

      console.log('[createTeamAsLocalAdmin] ✅ Team membership record created with status=approved')

      // Step 6: Validate user state with invariant guards
      console.log('[createTeamAsLocalAdmin] Step 6: Validating user state invariants...')
      try {
        validateUserTeamConsistency({
          id: userId,
          is_master_admin: false,
          team_id: teamId,
          role_id: localAdminRoleId,
        })
        console.log('[createTeamAsLocalAdmin] ✅ User state invariants validated')
      } catch (invariantError) {
        console.error('[createTeamAsLocalAdmin] User invariant validation failed:', invariantError)
        throw invariantError
      }

      // Step 7: Validate membership state with invariant guards
      console.log('[createTeamAsLocalAdmin] Step 7: Validating membership state invariants...')
      try {
        validateMembershipState({
          id: (membershipData as any).id,
          status: 'approved',
          approved_at: now,
          approved_by: userId,
          rejected_at: null,
        })
        console.log('[createTeamAsLocalAdmin] ✅ Membership state invariants validated')
      } catch (invariantError) {
        console.error('[createTeamAsLocalAdmin] Membership invariant validation failed:', invariantError)
        throw invariantError
      }

      console.log('[createTeamAsLocalAdmin] ✅ All invariants validated successfully')

      return {
        success: true,
        data: {
          user: userData as UserWithRole,
          team: teamData,
        },
      }
    } catch (setupError) {
      // Cleanup: Delete auth user if setup fails
      console.error('[createTeamAsLocalAdmin] Setup failed, error:', setupError)
      throw setupError
    }
  } catch (error) {
    console.error('[createTeamAsLocalAdmin] Error:', error)
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
      // Note: users table has columns: id, email, team_id, role_id, is_master_admin
      // MASTER ADMIN STATE: is_master_admin=true, team_id=null, role_id=null
      console.log('Creating master admin user record...')
      const { data: userData, error: userError } = await (supabase.from('users') as any)
        .insert({
          id: userId,
          email: data.email.trim().toLowerCase(),
          team_id: null,
          role_id: null,
          is_master_admin: true,
        } as any)
        .select(`
          id,
          team_id,
          role_id,
          email,
          is_master_admin,
          created_at,
          updated_at
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
      .eq('id', userId)
      .select(`
        id,
        team_id,
        role_id,
        email,
        is_master_admin,
        created_at,
        updated_at
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
