/**
 * Team Context Utility V2
 *
 * Provides server-side utilities for extracting and validating team context
 * from authenticated users. This is the foundation of multi-tenant security.
 *
 * Key Principles:
 * - NEVER trust team_id from client requests
 * - ALWAYS extract team_id from authenticated user
 * - Master admins can optionally specify a target team_id
 * - Regular users are automatically scoped to their team
 * - Includes permission checking and local admin detection
 */

import { createServerClient } from '@/lib/supabase/server'
import type { TeamContext } from '@/types/database'

export interface TeamContextOptions {
  /**
   * For master admin: explicitly specify which team to operate on
   * If not specified, master admin can see all teams
   */
  targetTeamId?: string

  /**
   * Whether to require a team_id (fail if user has no team)
   * Default: true
   */
  requireTeam?: boolean
}

/**
 * Get team context from authenticated user
 *
 * This is the PRIMARY function to use for multi-tenant operations.
 * Call this at the start of every API function that deals with tenant-scoped data.
 *
 * @param userId - The authenticated user's ID (from auth token)
 * @param options - Optional configuration
 * @returns TeamContext object with team information, admin flags, and permissions
 * @throws Error if user not found or team required but missing
 *
 * @example
 * ```ts
 * // In an API function
 * export async function GET(request: NextRequest) {
 *   const user = await getCurrentUser();
 *   if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
 *
 *   const teamContext = await getTeamContext(user.user_id);
 *
 *   let query = supabase.from('candidates').select('*');
 *   if (teamContext.teamId) {
 *     query = query.eq('team_id', teamContext.teamId);
 *   }
 *   // If teamId is null, master admin sees all
 * }
 * ```
 */
export async function getTeamContext(
  userId: string,
  options: TeamContextOptions = {}
): Promise<TeamContext> {
  const { targetTeamId, requireTeam = true } = options
  const supabase = await createServerClient()

  // Fetch user with role information
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      user_id,
      team_id,
      role_id,
      is_master_admin,
      role:roles (
        role_id,
        role_name,
        is_admin_role
      )
    `)
    .eq('user_id', userId)
    .single()

  if (error || !user) {
    throw new Error('User not found or not authenticated')
  }

  const isMasterAdmin = user.is_master_admin === true
  const userTeamId = user.team_id

  // Validate team requirement
  if (requireTeam && !userTeamId && !isMasterAdmin) {
    throw new Error('User does not belong to any team. Please contact your administrator.')
  }

  // Determine effective team_id for operations
  let effectiveTeamId: string | null

  if (isMasterAdmin) {
    // Master admin can specify a target team or operate on all teams
    effectiveTeamId = targetTeamId || null

    // If target team specified, validate it exists
    if (targetTeamId) {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('team_id')
        .eq('team_id', targetTeamId)
        .single()

      if (teamError || !team) {
        throw new Error(`Target team ${targetTeamId} does not exist`)
      }
    }

    // Master admins bypass permission checks
    return {
      teamId: effectiveTeamId,
      isMasterAdmin: true,
      isLocalAdmin: false,
      permissions: [], // Master admin has all permissions implicitly
    }
  }

  // Regular user - must have team and role
  if (!userTeamId) {
    throw new Error('User has no team assignment')
  }

  if (!user.role_id) {
    throw new Error('User has no role assignment')
  }

  // Validate user's team exists and is active
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('team_id, is_active')
    .eq('team_id', userTeamId)
    .single()

  if (teamError || !team) {
    throw new Error('User team does not exist. Please contact your administrator.')
  }

  if (team.is_active === false) {
    throw new Error('Your team is currently inactive. Please contact your administrator.')
  }

  // Check if user is local admin
  const isLocalAdmin = (user.role as any)?.is_admin_role === true

  // Get user permissions
  const { data: rolePermissions } = await supabase
    .from('role_permissions')
    .select(`
      permission:permissions (
        permission_key
      )
    `)
    .eq('role_id', user.role_id)

  const permissions = rolePermissions
    ?.map(rp => (rp.permission as any)?.permission_key)
    .filter(Boolean) || []

  return {
    teamId: userTeamId,
    isMasterAdmin: false,
    isLocalAdmin,
    permissions,
  }
}

/**
 * Validate team access for an operation
 *
 * Use this to check if a user can perform an operation on a specific team's data.
 * Typically used for read/update/delete operations where team_id already exists.
 *
 * @param userId - The authenticated user's ID
 * @param resourceTeamId - The team_id of the resource being accessed
 * @throws Error if user cannot access the resource's team
 *
 * @example
 * ```ts
 * export async function updateCandidate(candidateId, updates, userId) {
 *   // Get existing candidate
 *   const candidate = await getCandidateById(candidateId);
 *
 *   // Validate user can access this candidate's team
 *   await validateTeamAccess(userId, candidate.team_id);
 *
 *   // Proceed with update...
 * }
 * ```
 */
export async function validateTeamAccess(
  userId: string,
  resourceTeamId: string | null
): Promise<void> {
  if (!resourceTeamId) {
    throw new Error('Resource has no team association')
  }

  const teamContext = await getTeamContext(userId, { requireTeam: false })

  // Master admin can access any team
  if (teamContext.isMasterAdmin) {
    return
  }

  // Regular users can only access their own team
  if (teamContext.teamId !== resourceTeamId) {
    throw new Error('Access denied: You do not have permission to access this resource')
  }
}

/**
 * Apply team filter to query filters
 *
 * Helper function to add team filtering to list/search operations.
 * Handles master admin vs regular user logic consistently.
 *
 * @param userId - The authenticated user's ID
 * @param filters - Existing filter object (may include teamId for master admin)
 * @returns Enhanced filters with proper team scoping
 *
 * @example
 * ```ts
 * export async function getCandidates(filters, userId) {
 *   const teamFilters = await applyTeamFilter(userId, filters);
 *
 *   let query = supabase.from('candidates').select('*');
 *
 *   if (teamFilters.teamId) {
 *     query = query.eq('team_id', teamFilters.teamId);
 *   }
 *   // If teamFilters.teamId is null, master admin sees all teams
 * }
 * ```
 */
export async function applyTeamFilter<T extends Record<string, any>>(
  userId: string,
  filters: T = {} as T
): Promise<{ teamId: string | null; isMasterAdmin: boolean; isLocalAdmin: boolean } & T> {
  const targetTeamId = (filters as any).teamId
  const teamContext = await getTeamContext(userId, {
    requireTeam: false,
    targetTeamId,
  })

  return {
    ...filters,
    teamId: teamContext.teamId,
    isMasterAdmin: teamContext.isMasterAdmin,
    isLocalAdmin: teamContext.isLocalAdmin,
  }
}

/**
 * Get accessible team IDs for a user
 * Master admin gets all team IDs, regular users get their team only
 *
 * @param userId - The user's ID
 * @returns Array of team IDs the user can access
 */
export async function getAccessibleTeamIds(userId: string): Promise<string[]> {
  const supabase = await createServerClient()

  // Get user info
  const { data: user } = await supabase
    .from('users')
    .select('team_id, is_master_admin')
    .eq('user_id', userId)
    .single()

  if (!user) {
    return []
  }

  // Master admin can access all teams
  if (user.is_master_admin) {
    const { data: teams } = await supabase
      .from('teams')
      .select('team_id')
      .eq('is_active', true)

    return teams?.map(t => t.team_id) || []
  }

  // Regular user can only access their team
  return user.team_id ? [user.team_id] : []
}

/**
 * Check if user can access a specific team
 *
 * @param userId - The user's ID
 * @param teamId - The team ID to check
 * @returns True if user can access the team
 */
export async function canAccessTeam(
  userId: string,
  teamId: string
): Promise<boolean> {
  const accessibleTeams = await getAccessibleTeamIds(userId)
  return accessibleTeams.includes(teamId)
}

/**
 * Get team info for display purposes
 *
 * @param teamId - The team ID to fetch
 * @returns Team information or null if not found
 */
export async function getTeamInfo(teamId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('teams')
    .select('team_id, team_name, company_name, is_active, subscription_tier, settings')
    .eq('team_id', teamId)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

/**
 * Get team information for a user
 *
 * @param userId - The user's ID
 * @returns Team information or null if user has no team
 */
export async function getUserTeam(userId: string) {
  const supabase = await createServerClient()

  const { data: user } = await supabase
    .from('users')
    .select(`
      team_id,
      is_master_admin,
      team:teams (
        team_id,
        team_name,
        company_name,
        subscription_tier,
        is_active,
        settings
      )
    `)
    .eq('user_id', userId)
    .single()

  if (!user || user.is_master_admin) {
    return null
  }

  return user.team
}

/**
 * List all teams (master admin only)
 *
 * @param userId - The authenticated user's ID
 * @returns Array of teams
 * @throws Error if user is not master admin
 */
export async function listAllTeams(userId: string) {
  const teamContext = await getTeamContext(userId, { requireTeam: false })

  if (!teamContext.isMasterAdmin) {
    throw new Error('Access denied: Only master admins can list all teams')
  }

  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('teams')
    .select('team_id, team_name, company_name, subscription_tier, is_active, created_at, updated_at')
    .order('team_name')

  if (error) {
    throw new Error(`Failed to fetch teams: ${error.message}`)
  }

  return data || []
}

/**
 * Ensure user belongs to a team (not a master admin)
 * Throws error if user is master admin or has no team
 *
 * @param userId - The user's ID
 * @returns The user's team ID
 */
export async function requireTeamMembership(userId: string): Promise<string> {
  const supabase = await createServerClient()

  const { data: user } = await supabase
    .from('users')
    .select('user_id, team_id, is_master_admin')
    .eq('user_id', userId)
    .single()

  if (!user) {
    throw new Error('User not found')
  }

  if (user.is_master_admin) {
    throw new Error('Master admins do not belong to a specific team')
  }

  if (!user.team_id) {
    throw new Error('User has no team assignment')
  }

  return user.team_id
}
