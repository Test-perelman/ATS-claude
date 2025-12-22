/**
 * Server-Side Authentication Functions v2
 *
 * Key Changes from v1:
 * - No auto-creating teams on signup
 * - Explicit team creation flow: createTeamAsLocalAdmin()
 * - Explicit team joining flow: joinTeamAsNewMember()
 * - New approval workflow: approveMembership(), rejectMembership()
 * - All new users must choose: create team or request team access
 *
 * Use these functions only in Server Components, API Routes, and Server Actions
 */

import { createServerClient, createAdminClient } from './server'
import type { UserWithRole, ApiResponse, TeamMembership } from '@/types/database'
import { cloneRoleTemplatesForTeam, getLocalAdminRole } from '@/lib/utils/role-helpers'

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
      return null
    }

    if (!authUser) {
      console.log('[getCurrentUser] No auth user - not logged in')
      return null
    }

    console.log('[getCurrentUser] Auth user found:', authUser.id, 'email:', authUser.email)

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
      .eq('id', authUser.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[getCurrentUser] Unexpected query error:', error.message, 'for user:', authUser.id)
      throw error
    }

    if (!userData) {
      console.warn('[getCurrentUser] ⚠️ No user record found - user must complete signup or onboarding')
      return null
    }

    console.log('[getCurrentUser] ✅ User found:', (userData as any).id)
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
 * Create Team As Local Admin (v2 - NEW)
 *
 * User explicitly creates a new team after email verification.
 * User becomes local admin of the team and membership is auto-approved.
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
    const supabase = await createAdminClient()
    console.log('[createTeamAsLocalAdmin] Starting for auth user:', data.authUserId)

    try {
      // Step 1: Create team
      console.log('[createTeamAsLocalAdmin] Step 1: Creating team...')
      const { data: teamData, error: teamError } = await (supabase.from('teams') as any)
        .insert({
          name: data.teamName,
        })
        .select()
        .single()

      if (teamError || !teamData) {
        throw new Error(`Failed to create team: ${teamError?.message}`)
      }

      const teamId = (teamData as any).id
      console.log('[createTeamAsLocalAdmin] Team created:', teamId)

      // Step 2: Clone role templates
      console.log('[createTeamAsLocalAdmin] Step 2: Cloning role templates...')
      const roleIds = await cloneRoleTemplatesForTeam(teamId)
      if (!roleIds || roleIds.length === 0) {
        throw new Error('Failed to clone role templates for team')
      }
      console.log(`[createTeamAsLocalAdmin] Created ${roleIds.length} roles for team`)

      // Step 3: Get local admin role
      console.log('[createTeamAsLocalAdmin] Step 3: Getting Local Admin role...')
      const localAdminRole = await getLocalAdminRole(teamId)

      if (!localAdminRole) {
        throw new Error('Local Admin role not found after template cloning')
      }

      console.log('[createTeamAsLocalAdmin] Local Admin role ID:', (localAdminRole as any).id)

      // Step 4: Create user record
      console.log('[createTeamAsLocalAdmin] Step 4: Creating user record...')
      const { data: userData, error: userError } = await (supabase.from('users') as any)
        .insert({
          id: data.authUserId,
          email: data.email.trim().toLowerCase(),
          team_id: teamId,
          role_id: (localAdminRole as any).id,
          is_master_admin: false,
        })
        .select()
        .single()

      if (userError || !userData) {
        throw new Error(`Failed to create user: ${userError?.message}`)
      }

      console.log('[createTeamAsLocalAdmin] User record created')

      // Step 5: Create approved membership (auto-approve for team creator)
      console.log('[createTeamAsLocalAdmin] Step 5: Creating approved membership...')
      const now = new Date().toISOString()
      const { data: membershipData, error: membershipError } = await (
        supabase.from('team_memberships') as any
      )
        .insert({
          user_id: data.authUserId,
          team_id: teamId,
          status: 'approved',
          requested_at: now,
          approved_at: now,
          approved_by: null, // Self-approval (team creator)
        })
        .select()
        .single()

      if (membershipError || !membershipData) {
        throw new Error(`Failed to create membership: ${membershipError?.message}`)
      }

      console.log('[createTeamAsLocalAdmin] Approved membership created')

      // Step 6: Create team settings (default: not discoverable)
      console.log('[createTeamAsLocalAdmin] Step 6: Creating team settings...')
      await (supabase.from('team_settings') as any)
        .insert({
          team_id: teamId,
          is_discoverable: false,
        })
        .catch((err: any) => {
          console.warn('[createTeamAsLocalAdmin] Warning: Failed to create team settings:', err.message)
          // Not critical, continue
        })

      return {
        success: true,
        data: {
          user: userData as UserWithRole,
          team: teamData,
        },
      }
    } catch (setupError) {
      console.error('[createTeamAsLocalAdmin] Setup failed:', setupError)
      throw setupError
    }
  } catch (error) {
    console.error('[createTeamAsLocalAdmin] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Join Team As New Member (v2 - NEW)
 *
 * User explicitly requests access to an existing team after email verification.
 * User is created with team_id but NO role_id (waiting for admin assignment).
 * Membership is created as 'pending' until admin approves.
 *
 * @param data - Team join request data
 * @returns User and membership data or error
 */
export async function joinTeamAsNewMember(data: {
  authUserId: string
  email: string
  teamId: string
  firstName: string
  lastName: string
  requestedRoleId?: string
  message?: string
}): Promise<ApiResponse<{ user: UserWithRole; membership: TeamMembership }>> {
  try {
    const supabase = await createAdminClient()
    console.log('[joinTeamAsNewMember] Starting for auth user:', data.authUserId, 'team:', data.teamId)

    try {
      // Step 1: Validate team exists
      console.log('[joinTeamAsNewMember] Step 1: Validating team...')
      const { data: teamData, error: teamError } = await (supabase.from('teams') as any)
        .select('id')
        .eq('id', data.teamId)
        .single()

      if (teamError || !teamData) {
        throw new Error(`Team ${data.teamId} not found`)
      }

      // Step 2: Create user record (with team_id but NO role_id yet)
      console.log('[joinTeamAsNewMember] Step 2: Creating user record...')
      const { data: userData, error: userError } = await (supabase.from('users') as any)
        .insert({
          id: data.authUserId,
          email: data.email.trim().toLowerCase(),
          team_id: data.teamId,
          role_id: null, // Not assigned yet - will be assigned on approval
          is_master_admin: false,
        })
        .select()
        .single()

      if (userError || !userData) {
        throw new Error(`Failed to create user: ${userError?.message}`)
      }

      console.log('[joinTeamAsNewMember] User record created with pending status')

      // Step 3: Create pending membership
      console.log('[joinTeamAsNewMember] Step 3: Creating pending membership...')
      const { data: membershipData, error: membershipError } = await (
        supabase.from('team_memberships') as any
      )
        .insert({
          user_id: data.authUserId,
          team_id: data.teamId,
          status: 'pending',
          requested_at: new Date().toISOString(),
          requested_role_id: data.requestedRoleId || null,
          // approved_at, approved_by left NULL
        })
        .select()
        .single()

      if (membershipError || !membershipData) {
        throw new Error(`Failed to create membership: ${membershipError?.message}`)
      }

      console.log('[joinTeamAsNewMember] Pending membership created, awaiting approval')

      return {
        success: true,
        data: {
          user: userData as UserWithRole,
          membership: membershipData as TeamMembership,
        },
      }
    } catch (setupError) {
      console.error('[joinTeamAsNewMember] Setup failed:', setupError)
      throw setupError
    }
  } catch (error) {
    console.error('[joinTeamAsNewMember] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Approve Membership (v2 - NEW)
 *
 * Admin approves a pending membership and assigns a role.
 * User gains full data access after approval.
 *
 * @param data - Approval data
 * @returns Updated membership and user or error
 */
export async function approveMembership(data: {
  adminUserId: string
  membershipId: string
  roleId: string
  message?: string
}): Promise<ApiResponse<{ membership: TeamMembership; user: UserWithRole }>> {
  try {
    const supabase = await createServerClient()
    console.log('[approveMembership] Starting approval by admin:', data.adminUserId)

    // Step 1: Fetch membership
    console.log('[approveMembership] Step 1: Fetching membership...')
    const { data: membershipData, error: membershipError } = await (
      supabase.from('team_memberships') as any
    )
      .select('*')
      .eq('id', data.membershipId)
      .single()

    if (membershipError || !membershipData) {
      throw new Error('Membership not found')
    }

    console.log('[approveMembership] Membership found, user:', (membershipData as any).user_id)

    // Step 2: Verify approver has permission
    // Note: In a real implementation, you'd call getTeamContext() to verify admin status
    console.log('[approveMembership] Step 2: Verifying admin permission...')
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, is_master_admin, team_id, role:roles(is_admin)')
      .eq('id', data.adminUserId)
      .single()

    if (!adminUser) {
      throw new Error('Admin user not found')
    }

    const isMasterAdmin = (adminUser as any).is_master_admin
    const isLocalAdmin =
      !isMasterAdmin &&
      (adminUser as any).team_id === (membershipData as any).team_id &&
      (adminUser as any).role?.is_admin === true

    if (!isMasterAdmin && !isLocalAdmin) {
      throw new Error('Not authorized to approve membership for this team')
    }

    console.log('[approveMembership] Admin verified')

    // Step 3: Update membership to approved
    console.log('[approveMembership] Step 3: Updating membership status...')
    const now = new Date().toISOString()
    const { data: updatedMembership, error: updateError } = await (
      supabase.from('team_memberships') as any
    )
      .update({
        status: 'approved',
        approved_at: now,
        approved_by: data.adminUserId,
      })
      .eq('id', data.membershipId)
      .select()
      .single()

    if (updateError || !updatedMembership) {
      throw new Error(`Failed to approve membership: ${updateError?.message}`)
    }

    console.log('[approveMembership] Membership approved')

    // Step 4: Assign role to user
    console.log('[approveMembership] Step 4: Assigning role to user...')
    const { data: updatedUser, error: userError } = await (supabase.from('users') as any)
      .update({ role_id: data.roleId })
      .eq('id', (membershipData as any).user_id)
      .select()
      .single()

    if (userError || !updatedUser) {
      throw new Error(`Failed to assign role: ${userError?.message}`)
    }

    console.log('[approveMembership] Role assigned, user now has full access')

    return {
      success: true,
      data: {
        membership: updatedMembership as TeamMembership,
        user: updatedUser as UserWithRole,
      },
    }
  } catch (error) {
    console.error('[approveMembership] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Reject Membership (v2 - NEW)
 *
 * Admin rejects a pending membership.
 * User cannot access team data.
 * User can request access again later.
 *
 * @param data - Rejection data
 * @returns Updated membership or error
 */
export async function rejectMembership(data: {
  adminUserId: string
  membershipId: string
  reason: string
}): Promise<ApiResponse<{ membership: TeamMembership }>> {
  try {
    const supabase = await createServerClient()
    console.log('[rejectMembership] Starting rejection by admin:', data.adminUserId)

    // Step 1: Fetch membership
    console.log('[rejectMembership] Step 1: Fetching membership...')
    const { data: membershipData, error: membershipError } = await (
      supabase.from('team_memberships') as any
    )
      .select('*')
      .eq('id', data.membershipId)
      .single()

    if (membershipError || !membershipData) {
      throw new Error('Membership not found')
    }

    console.log('[rejectMembership] Membership found')

    // Step 2: Verify approver has permission
    console.log('[rejectMembership] Step 2: Verifying admin permission...')
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, is_master_admin, team_id, role:roles(is_admin)')
      .eq('id', data.adminUserId)
      .single()

    if (!adminUser) {
      throw new Error('Admin user not found')
    }

    const isMasterAdmin = (adminUser as any).is_master_admin
    const isLocalAdmin =
      !isMasterAdmin &&
      (adminUser as any).team_id === (membershipData as any).team_id &&
      (adminUser as any).role?.is_admin === true

    if (!isMasterAdmin && !isLocalAdmin) {
      throw new Error('Not authorized to reject membership for this team')
    }

    console.log('[rejectMembership] Admin verified')

    // Step 3: Update membership to rejected
    console.log('[rejectMembership] Step 3: Updating membership status...')
    const { data: updatedMembership, error: updateError } = await (
      supabase.from('team_memberships') as any
    )
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: data.reason,
      })
      .eq('id', data.membershipId)
      .select()
      .single()

    if (updateError || !updatedMembership) {
      throw new Error(`Failed to reject membership: ${updateError?.message}`)
    }

    console.log('[rejectMembership] Membership rejected')

    return {
      success: true,
      data: {
        membership: updatedMembership as TeamMembership,
      },
    }
  } catch (error) {
    console.error('[rejectMembership] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
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
    const supabase = await createAdminClient()

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
