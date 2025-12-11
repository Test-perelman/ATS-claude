/**
 * Team Context Utility
 *
 * Provides server-side utilities for extracting and validating team context
 * from authenticated users. This is the foundation of multi-tenant security.
 *
 * Key Principles:
 * - NEVER trust team_id from client requests
 * - ALWAYS extract team_id from authenticated user
 * - Master admins can optionally specify a target team_id
 * - Regular users are automatically scoped to their team
 */

import { supabase } from '@/lib/supabase/client';

export interface TeamContext {
  /**
   * The team ID to use for data operations
   * - For regular users: their own team_id
   * - For master admin: specified target or null (all teams)
   */
  teamId: string | null;

  /**
   * The authenticated user's actual team_id
   */
  userTeamId: string | null;

  /**
   * Whether the user is a master admin
   */
  isMasterAdmin: boolean;

  /**
   * Whether the user can access multiple teams
   */
  canAccessAllTeams: boolean;
}

export interface TeamContextOptions {
  /**
   * For master admin: explicitly specify which team to operate on
   * If not specified, master admin can see all teams
   */
  targetTeamId?: string;

  /**
   * Whether to require a team_id (fail if user has no team)
   * Default: true
   */
  requireTeam?: boolean;
}

/**
 * Get team context from authenticated user
 *
 * This is the PRIMARY function to use for multi-tenant operations.
 * Call this at the start of every API function that deals with tenant-scoped data.
 *
 * @param userId - The authenticated user's ID (from auth token)
 * @param options - Optional configuration
 * @returns TeamContext object with team information
 * @throws Error if user not found or team required but missing
 *
 * @example
 * ```ts
 * // In an API function
 * export async function createCandidate(data, userId) {
 *   const teamContext = await getTeamContext(userId);
 *
 *   const result = await typedInsert('candidates', {
 *     ...data,
 *     team_id: teamContext.teamId, // Server-controlled
 *   });
 * }
 * ```
 */
export async function getTeamContext(
  userId: string,
  options: TeamContextOptions = {}
): Promise<TeamContext> {
  const { targetTeamId, requireTeam = true } = options;

  // Fetch user with team information
  const { data: user, error } = await supabase
    .from('users')
    .select('user_id, team_id, is_master_admin')
    .eq('user_id', userId)
    .single();

  if (error || !user) {
    throw new Error('User not found or not authenticated');
  }

  const isMasterAdmin = user.is_master_admin === true;
  const userTeamId = user.team_id;

  // Validate team requirement
  if (requireTeam && !userTeamId && !isMasterAdmin) {
    throw new Error('User does not belong to any team. Please contact your administrator.');
  }

  // Determine effective team_id for operations
  let effectiveTeamId: string | null;

  if (isMasterAdmin) {
    // Master admin can specify a target team or operate on all teams
    effectiveTeamId = targetTeamId || null;

    // If target team specified, validate it exists
    if (targetTeamId) {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('team_id')
        .eq('team_id', targetTeamId)
        .single();

      if (teamError || !team) {
        throw new Error(`Target team ${targetTeamId} does not exist`);
      }
    }
  } else {
    // Regular users are scoped to their own team
    effectiveTeamId = userTeamId;

    // Validate user's team exists and is active
    if (effectiveTeamId) {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('team_id, is_active')
        .eq('team_id', effectiveTeamId)
        .single();

      if (teamError || !team) {
        throw new Error('User team does not exist. Please contact your administrator.');
      }

      if ((team as any).is_active === false) {
        throw new Error('Your team is currently inactive. Please contact your administrator.');
      }
    }
  }

  return {
    teamId: effectiveTeamId,
    userTeamId,
    isMasterAdmin,
    canAccessAllTeams: isMasterAdmin,
  };
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
    throw new Error('Resource has no team association');
  }

  const teamContext = await getTeamContext(userId, { requireTeam: false });

  // Master admin can access any team
  if (teamContext.isMasterAdmin) {
    return;
  }

  // Regular users can only access their own team
  if (teamContext.userTeamId !== resourceTeamId) {
    throw new Error('Access denied: You do not have permission to access this resource');
  }
}

/**
 * Apply team filter to query filters
 *
 * Helper function to add team filtering to list/search operations.
 * Handles master admin vs regular user logic consistently.
 *
 * @param userId - The authenticated user's ID
 * @param filters - Existing filter object (may include targetTeamId for master admin)
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
export async function applyTeamFilter<T extends { teamId?: string }>(
  userId: string,
  filters?: T
): Promise<{ teamId: string | null; isMasterAdmin: boolean } & T> {
  const teamContext = await getTeamContext(userId, { requireTeam: false });

  let effectiveTeamId: string | null;

  if (teamContext.isMasterAdmin) {
    // Master admin can filter by specific team or see all
    effectiveTeamId = filters?.teamId || null;
  } else {
    // Regular users always filtered to their team
    effectiveTeamId = teamContext.teamId;
  }

  return {
    ...filters,
    teamId: effectiveTeamId,
    isMasterAdmin: teamContext.isMasterAdmin,
  } as { teamId: string | null; isMasterAdmin: boolean } & T;
}

/**
 * Get team info for display purposes
 *
 * @param teamId - The team ID to fetch
 * @returns Team information or null if not found
 */
export async function getTeamInfo(teamId: string) {
  const { data, error } = await supabase
    .from('teams')
    .select('team_id, team_name, company_name, is_active')
    .eq('team_id', teamId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * List all teams (master admin only)
 *
 * @param userId - The authenticated user's ID
 * @returns Array of teams
 * @throws Error if user is not master admin
 */
export async function listAllTeams(userId: string) {
  const teamContext = await getTeamContext(userId, { requireTeam: false });

  if (!teamContext.isMasterAdmin) {
    throw new Error('Access denied: Only master admins can list all teams');
  }

  const { data, error } = await supabase
    .from('teams')
    .select('team_id, team_name, company_name, is_active, created_at')
    .order('team_name');

  if (error) {
    throw new Error(`Failed to fetch teams: ${error.message}`);
  }

  return data || [];
}
