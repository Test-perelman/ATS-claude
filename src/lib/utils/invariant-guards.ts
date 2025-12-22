/**
 * Invariant Guards - Central validation for user state
 *
 * These functions enforce v2 invariants:
 * - Non-master users must have: team_id, role_id, and approved membership
 * - Master admins have no memberships
 * - No data access without approved membership
 */

import { createServerClient } from '@/lib/supabase/server'
import type { TeamMembership } from '@/types/database'

// ============================================================================
// CUSTOM ERROR TYPES
// ============================================================================

/**
 * Thrown when user's team/role assignment violates v2 invariants
 */
export class InvalidUserStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidUserStateError'
  }
}

/**
 * Thrown when membership record violates v2 invariants
 */
export class InvalidMembershipStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidMembershipStateError'
  }
}

/**
 * Thrown when user does not have required access
 */
export class AccessDeniedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AccessDeniedError'
  }
}

// ============================================================================
// SYNCHRONOUS VALIDATION FUNCTIONS (for application-level checks)
// ============================================================================

/**
 * Validate user has correct team_id and role_id for their type
 * Use this synchronously on User objects from database
 *
 * Master admin invariant:
 *   is_master_admin = true  → team_id = null AND role_id = null
 *
 * Team user invariant:
 *   is_master_admin = false → team_id = NOT NULL AND role_id = NOT NULL
 *
 * @param user - User object with team_id, role_id, is_master_admin
 * @throws InvalidUserStateError if invariant violated
 */
export function validateUserTeamConsistency(user: {
  id?: string
  is_master_admin: boolean
  team_id: string | null
  role_id: string | null
}): void {
  const isMasterAdmin = user.is_master_admin === true

  if (isMasterAdmin) {
    // Master admin: must have NO team_id and NO role_id
    if (user.team_id !== null || user.role_id !== null) {
      throw new InvalidUserStateError(
        `Master admin user has invalid state: team_id=${user.team_id}, role_id=${user.role_id}. ` +
          `Master admins must have team_id=null and role_id=null.`
      )
    }
  } else {
    // Team user: must have BOTH team_id and role_id
    if (!user.team_id || !user.role_id) {
      throw new InvalidUserStateError(
        `Team user has invalid state: team_id=${user.team_id}, role_id=${user.role_id}. ` +
          `Team users must have non-null team_id and role_id.`
      )
    }
  }
}

/**
 * Validate membership record has correct status and timestamps
 * Use this synchronously on TeamMembership objects
 *
 * Status invariants:
 *   status = 'approved'  → approved_at NOT NULL, approved_by NOT NULL
 *   status = 'pending'   → (no additional requirements)
 *   status = 'rejected'  → rejected_at NOT NULL
 *
 * @param membership - TeamMembership object
 * @throws InvalidMembershipStateError if invariant violated
 */
export function validateMembershipState(membership: {
  id?: string
  status: 'pending' | 'approved' | 'rejected'
  approved_at?: string | null
  approved_by?: string | null
  rejected_at?: string | null
}): void {
  const { status, approved_at, approved_by, rejected_at } = membership

  if (status === 'approved') {
    if (!approved_at || !approved_by) {
      throw new InvalidMembershipStateError(
        `Approved membership missing approval metadata: approved_at=${approved_at}, approved_by=${approved_by}. ` +
          `Approved memberships must have both approved_at and approved_by set.`
      )
    }
  } else if (status === 'rejected') {
    if (!rejected_at) {
      throw new InvalidMembershipStateError(
        `Rejected membership missing rejection timestamp: rejected_at=${rejected_at}. ` +
          `Rejected memberships must have rejected_at set.`
      )
    }
  } else if (status === 'pending') {
    // No additional requirements for pending
  } else {
    throw new InvalidMembershipStateError(
      `Invalid membership status: ${status}. ` +
        `Status must be one of: pending, approved, rejected.`
    )
  }
}

/**
 * Validate user does not have pending membership to a resource
 * Use this to prevent access when membership awaits approval
 *
 * @param user - User object with pending_membership_status (optional field)
 * @param resource - Resource being accessed (for error message)
 * @throws AccessDeniedError if user has pending membership
 */
export function validatePendingUserAccess(
  user: {
    id?: string
    pending_membership_status?: string | null
  },
  resource: string
): void {
  if (user.pending_membership_status === 'pending') {
    throw new AccessDeniedError(
      `User has pending membership, cannot access ${resource}`
    )
  }
}

/**
 * Validate user is approved for a specific team
 * Use this to enforce approved status check before team operations
 *
 * @param user - User object with approved_teams (array of approved team IDs)
 * @param team_id - Team ID to check
 * @throws AccessDeniedError if user not approved for team_id
 */
export function validateApprovedUserAccess(
  user: {
    id?: string
    approved_teams?: string[]
  },
  team_id: string
): void {
  const approvedTeams = user.approved_teams || []
  if (!approvedTeams.includes(team_id)) {
    throw new AccessDeniedError(`User not approved for team ${team_id}`)
  }
}

/**
 * Validate user has approved membership to a specific team
 * Use this to check access before operations on team data
 *
 * @param userId - The authenticated user's ID
 * @param teamId - The team ID to check
 * @throws Error if user not found, team doesn't exist, or membership not approved
 * @returns Membership record and user data
 */
export async function requireApprovedMembership(
  userId: string,
  teamId: string
): Promise<{ membership: TeamMembership; user: any }> {
  const supabase = await createServerClient()

  // Step 1: Check user exists
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, team_id, role_id, is_master_admin')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    throw new Error(`User ${userId} not found`)
  }

  // Step 2: Master admins bypass membership checks
  if ((user as any).is_master_admin) {
    return { membership: null as any, user }
  }

  // Step 3: Check approved membership exists
  const { data: membership, error: membershipError } = await supabase
    .from('team_memberships')
    .select('*')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .eq('status', 'approved')
    .single()

  if (membershipError || !membership) {
    throw new Error(
      `User ${userId} does not have approved access to team ${teamId}`
    )
  }

  return { membership: membership as TeamMembership, user }
}

/**
 * Validate user state matches all invariants
 * Use this in getTeamContext() to fail fast on invalid state
 *
 * Checks:
 * - Master admin: no team_id, no role_id
 * - Regular user: has team_id, has role_id, has approved membership
 *
 * @param userId - The authenticated user's ID
 * @throws Error if any invariant violated
 */
export async function validateUserInvariants(userId: string): Promise<void> {
  const supabase = await createServerClient()

  // Fetch user
  const { data: user, error } = await supabase
    .from('users')
    .select('id, team_id, role_id, is_master_admin')
    .eq('id', userId)
    .single()

  if (error || !user) {
    throw new Error('User not found')
  }

  // Master admin: must have team_id=NULL and role_id=NULL
  if ((user as any).is_master_admin) {
    if ((user as any).team_id !== null || (user as any).role_id !== null) {
      throw new Error(
        'INVARIANT_VIOLATION: Master admin cannot have team_id or role_id'
      )
    }
    return
  }

  // Regular user: must have team_id and role_id
  if (!(user as any).team_id || !(user as any).role_id) {
    throw new Error(
      'INVARIANT_VIOLATION: Regular user missing team_id or role_id'
    )
  }

  // Regular user: must have exactly one approved membership for their team
  const { count, error: countError } = await supabase
    .from('team_memberships')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('team_id', (user as any).team_id)
    .eq('status', 'approved')

  if (countError) {
    throw new Error(`Failed to check membership: ${countError.message}`)
  }

  if (count !== 1) {
    throw new Error(
      `INVARIANT_VIOLATION: User has ${count || 0} approved memberships (expected 1)`
    )
  }
}

/**
 * Check if user has any pending memberships (awaiting approval)
 * Use this to determine if user needs to see pending approval UI
 *
 * @param userId - The authenticated user's ID
 * @returns Array of pending membership records
 */
export async function getPendingMemberships(userId: string): Promise<any[]> {
  const supabase = await createServerClient()

  const { data: memberships, error } = await supabase
    .from('team_memberships')
    .select('*, team:teams(id, name)')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch pending memberships:', error)
    return []
  }

  return memberships || []
}

/**
 * Check if user's current team membership is pending
 * Use this to prevent access if membership not yet approved
 *
 * @param userId - The authenticated user's ID
 * @returns True if user has pending membership to their assigned team
 */
export async function hasPendingMembership(userId: string): Promise<boolean> {
  const supabase = await createServerClient()

  // Get user's team
  const { data: user } = await supabase
    .from('users')
    .select('team_id')
    .eq('id', userId)
    .single()

  if (!user || !(user as any).team_id) {
    return false
  }

  // Check if membership is pending
  const { count } = await supabase
    .from('team_memberships')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('team_id', (user as any).team_id)
    .eq('status', 'pending')

  return (count || 0) > 0
}

/**
 * Check if team is discoverable (users can see and request access)
 * Use this to show available teams in join flow
 *
 * @param teamId - The team ID to check
 * @returns True if team is discoverable
 */
export async function isTeamDiscoverable(teamId: string): Promise<boolean> {
  const supabase = await createServerClient()

  const { data: settings } = await supabase
    .from('team_settings')
    .select('is_discoverable')
    .eq('team_id', teamId)
    .single()

  return (settings as any)?.is_discoverable === true
}

/**
 * Get all discoverable teams for join flow
 * Use this to show teams available for new users
 *
 * @returns Array of discoverable teams
 */
export async function getDiscoverableTeams(): Promise<any[]> {
  const supabase = await createServerClient()

  const { data: teams, error } = await supabase
    .from('team_settings')
    .select('team_id, description, teams!inner(id, name)')
    .eq('is_discoverable', true)
    .order('teams(name)', { ascending: true })

  if (error) {
    console.error('Failed to fetch discoverable teams:', error)
    return []
  }

  return (teams || []).map((ts: any) => ({
    id: (ts.teams as any).id,
    name: (ts.teams as any).name,
    description: ts.description,
  }))
}
