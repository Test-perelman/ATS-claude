/**
 * Candidate API Functions
 *
 * Multi-Tenant Architecture:
 * - All create/update/delete operations require authenticated userId
 * - team_id is ALWAYS extracted server-side from user context
 * - NEVER trust team_id from client requests
 * - Master admins can optionally specify target team via filters
 */

import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { findDuplicateCandidates, mergeCandidateData } from '@/lib/utils/deduplication';
import { createAuditLog, createActivity } from '@/lib/utils/audit';
import { getTeamContext, applyTeamFilter, validateTeamAccess } from '@/lib/utils/team-context';
import type { Database } from '@/types/database';
import type { ApiResponse, ApiArrayResponse, ApiVoidResponse } from '@/types/api';

type Candidate = Database['public']['Tables']['candidates']['Row'];
type CandidateInsert = Database['public']['Tables']['candidates']['Insert'];
type CandidateUpdate = Database['public']['Tables']['candidates']['Update'];

type CandidatesWithCount = {
  data: Candidate[];
  count: number | null;
};

type CreateCandidateResponse =
  | { data: Candidate; error?: never; duplicate: false }
  | { data?: never; error: string; duplicate?: false }
  | { data?: never; error?: never; duplicate: true; matches: any[]; matchType: string };

/**
 * Get all candidates with filters
 *
 * @param userId - Authenticated user ID (REQUIRED for team scoping)
 * @param filters - Optional filters (search, status, pagination)
 * @param filters.teamId - For master admin: specify which team to view (null = all teams)
 *
 * @example
 * // Regular user - automatically scoped to their team
 * const result = await getCandidates(userId, { search: 'john' });
 *
 * // Master admin - view specific team
 * const result = await getCandidates(masterAdminUserId, { teamId: 'team-123' });
 *
 * // Master admin - view all teams
 * const result = await getCandidates(masterAdminUserId, {});
 */
export async function getCandidates(
  userId: string,
  filters?: {
    search?: string;
    benchStatus?: string;
    visaStatus?: string;
    limit?: number;
    offset?: number;
    teamId?: string; // Only used by master admin to filter specific team
  }
): Promise<ApiResponse<CandidatesWithCount>> {
  try {
    // Apply team filtering based on user's context
    const teamFilters = await applyTeamFilter(userId, filters);

    let query = supabase
      .from('candidates')
      .select(`
        *,
        visa_status:visa_status(visa_name),
        sales_manager:sales_manager_id(username),
        recruiter_manager:recruiter_manager_id(username),
        team:team_id(team_id, team_name, company_name)
      `, { count: 'exact' });

    // Apply team filter
    if (teamFilters.teamId) {
      // Specific team filter (regular user or master admin with team selection)
      query = query.eq('team_id', teamFilters.teamId);
    }
    // If teamFilters.teamId is null, master admin sees all teams

    if (filters?.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email_address.ilike.%${filters.search}%`
      );
    }

    if (filters?.benchStatus) {
      query = query.eq('bench_status', filters.benchStatus);
    }

    if (filters?.visaStatus) {
      query = query.eq('visa_status_id', filters.visaStatus);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      return { error: error.message };
    }

    return { data: { data: data as Candidate[], count } };
  } catch (err) {
    return { error: 'Failed to fetch candidates' };
  }
}

/**
 * Get candidate by ID
 */
export async function getCandidateById(candidateId: string): Promise<ApiResponse<Candidate>> {
  try {
    const { data, error } = await supabase
      .from('candidates')
      .select(`
        *,
        visa_status:visa_status(visa_name, description),
        sales_manager:sales_manager_id(username, email),
        sales_executive:sales_executive_id(username, email),
        recruiter_manager:recruiter_manager_id(username, email),
        recruiter_executive:recruiter_executive_id(username, email),
        created_by_user:created_by(username),
        updated_by_user:updated_by(username)
      `)
      .eq('candidate_id', candidateId)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as Candidate };
  } catch (err) {
    return { error: 'Failed to fetch candidate' };
  }
}

/**
 * Create a new candidate with deduplication
 *
 * @param candidateData - Candidate data (WITHOUT team_id - it will be set server-side)
 * @param userId - Authenticated user ID (REQUIRED)
 * @param options - Optional configuration
 *
 * @example
 * ```ts
 * const result = await createCandidate(
 *   { first_name: 'John', last_name: 'Doe', ... },
 *   authenticatedUserId
 * );
 * ```
 *
 * Security:
 * - team_id is ALWAYS extracted from authenticated user
 * - Client cannot manipulate team_id
 * - RLS policies enforce team isolation at database level
 */
export async function createCandidate(
  candidateData: Omit<CandidateInsert, 'team_id' | 'created_by' | 'updated_by'>,
  userId: string,
  options?: { skipDuplicateCheck?: boolean }
): Promise<CreateCandidateResponse> {
  try {
    // Extract team context from authenticated user (SERVER-SIDE)
    const teamContext = await getTeamContext(userId);

    if (!teamContext.teamId) {
      return { error: 'Cannot create candidate: User team not found. Please contact your administrator.' };
    }

    // Check for duplicates unless explicitly skipped
    if (!options?.skipDuplicateCheck) {
      const duplicateCheck = await findDuplicateCandidates({
        email_address: candidateData.email_address || undefined,
        phone_number: candidateData.phone_number || undefined,
        first_name: candidateData.first_name,
        last_name: candidateData.last_name,
        passport_number: candidateData.passport_number || undefined,
      });

      if (duplicateCheck.found && duplicateCheck.matches.length > 0) {
        // Return duplicate info for user decision
        return {
          duplicate: true,
          matches: duplicateCheck.matches,
          matchType: duplicateCheck.matchType,
        };
      }
    }

    // Create new candidate with server-controlled team_id
    const { data, error } = await typedInsert('candidates', {
      ...candidateData,
      team_id: teamContext.teamId, // SERVER-CONTROLLED - never from client
      created_by: userId,
      updated_by: userId,
    });

    if (error) {
      return { error: error.message };
    }

    if (data) {
      // Create audit log
      await createAuditLog({
        entityName: 'candidates',
        entityId: data.candidate_id,
        action: 'CREATE',
        newValue: data,
        userId,
        teamId: data.team_id || undefined,
      });

      // Create activity
      await createActivity({
        entityType: 'candidate',
        entityId: data.candidate_id,
        activityType: 'created',
        activityTitle: 'Candidate Created',
        activityDescription: `${data.first_name} ${data.last_name} was added to the system`,
        userId,
        teamId: data.team_id || undefined,
      });
    }

    return { data: data as Candidate, duplicate: false };
  } catch (err: any) {
    return { error: err.message || 'Failed to create candidate' };
  }
}

/**
 * Update an existing candidate
 *
 * @param candidateId - The candidate ID to update
 * @param updates - Fields to update (team_id cannot be changed)
 * @param userId - Authenticated user ID (REQUIRED)
 *
 * Security:
 * - Validates user has access to the candidate's team
 * - Master admin can update any team's candidates
 * - Regular users can only update their own team's candidates
 */
export async function updateCandidate(
  candidateId: string,
  updates: Omit<CandidateUpdate, 'team_id' | 'updated_by'>,
  userId: string
): Promise<ApiResponse<Candidate>> {
  try {
    // Get current data for audit log and team validation
    const oldDataResult = await getCandidateById(candidateId);
    if ('error' in oldDataResult) {
      return oldDataResult;
    }
    const oldData = oldDataResult.data;

    if (!oldData) {
      return { error: 'Candidate not found' };
    }

    // Validate user has access to this candidate's team
    await validateTeamAccess(userId, oldData.team_id);

    // Update candidate (team_id cannot be changed)
    const { data, error } = await typedUpdate('candidates', 'candidate_id', candidateId, {
      ...updates,
      updated_by: userId,
    });

    if (error) {
      return { error: error.message };
    }

    if (data) {
      // Create audit log
      await createAuditLog({
        entityName: 'candidates',
        entityId: candidateId,
        action: 'UPDATE',
        oldValue: oldData,
        newValue: data,
        userId,
      });

      // Create activity for significant changes
      if (updates.bench_status && updates.bench_status !== oldData?.bench_status) {
        await createActivity({
          entityType: 'candidate',
          entityId: candidateId,
          activityType: 'status_change',
          activityTitle: 'Bench Status Updated',
          activityDescription: `Status changed from ${oldData?.bench_status} to ${updates.bench_status}`,
          userId,
        });
      }
    }

    return { data: data as Candidate };
  } catch (err) {
    return { error: 'Failed to update candidate' };
  }
}

/**
 * Merge candidate data with existing record
 *
 * @param existingCandidateId - The existing candidate ID
 * @param newData - New data to merge
 * @param userId - Authenticated user ID (REQUIRED)
 */
export async function mergeCandidate(
  existingCandidateId: string,
  newData: Partial<Omit<CandidateInsert, 'team_id'>>,
  userId: string
): Promise<ApiResponse<Candidate>> {
  try {
    // Get existing candidate
    const existingResult = await getCandidateById(existingCandidateId);

    if ('error' in existingResult) {
      return existingResult;
    }

    const existing = existingResult.data;
    if (!existing) {
      return { error: 'Candidate not found' };
    }

    // Validate user has access to this candidate's team
    await validateTeamAccess(userId, existing.team_id);

    // Merge data
    const merged = mergeCandidateData(existing, newData);

    // Update with merged data
    return updateCandidate(existingCandidateId, merged, userId);
  } catch (err: any) {
    return { error: err.message || 'Failed to merge candidate data' };
  }
}

/**
 * Delete a candidate
 *
 * @param candidateId - The candidate ID to delete
 * @param userId - Authenticated user ID (REQUIRED)
 *
 * Security:
 * - Validates user has access to the candidate's team
 * - Master admin can delete any team's candidates
 * - Regular users can only delete their own team's candidates
 */
export async function deleteCandidate(candidateId: string, userId: string): Promise<ApiVoidResponse> {
  try {
    // Get data for audit log and team validation
    const candidateResult = await getCandidateById(candidateId);
    if ('error' in candidateResult) {
      return { error: candidateResult.error || 'Failed to fetch candidate' };
    }
    const candidateData = candidateResult.data;

    if (!candidateData) {
      return { error: 'Candidate not found' };
    }

    // Validate user has access to this candidate's team
    await validateTeamAccess(userId, candidateData.team_id);

    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('candidate_id', candidateId);

    if (error) {
      return { error: error.message };
    }

    // Create audit log
    await createAuditLog({
      entityName: 'candidates',
      entityId: candidateId,
      action: 'DELETE',
      oldValue: candidateData,
      userId,
      teamId: candidateData.team_id || undefined,
    });

    return { data: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete candidate' };
  }
}

/**
 * Get candidates on bench
 */
export async function getBenchCandidates(userId: string): Promise<ApiResponse<CandidatesWithCount>> {
  return getCandidates(userId, { benchStatus: 'on_bench' });
}

/**
 * Get available candidates
 */
export async function getAvailableCandidates(userId: string): Promise<ApiResponse<CandidatesWithCount>> {
  return getCandidates(userId, { benchStatus: 'available' });
}

/**
 * Add candidate to bench
 */
export async function addToBench(
  candidateId: string,
  userId: string,
  notes?: string
): Promise<ApiResponse<Candidate>> {
  try {
    // Update candidate status
    const result = await updateCandidate(
      candidateId,
      {
        bench_status: 'on_bench',
        bench_added_date: new Date().toISOString().split('T')[0],
      },
      userId
    );

    if ('error' in result) {
      return result;
    }

    const data = result.data;

    // Add to bench history
    await typedInsert('bench_history', {
      candidate_id: candidateId,
      bench_added_date: new Date().toISOString().split('T')[0],
      notes: notes || null,
    });

    // Create activity
    await createActivity({
      entityType: 'candidate',
      entityId: candidateId,
      activityType: 'bench',
      activityTitle: 'Added to Bench',
      activityDescription: notes || 'Candidate added to bench',
      userId,
    });

    return { data };
  } catch (err) {
    return { error: 'Failed to add candidate to bench' };
  }
}

/**
 * Remove candidate from bench
 */
export async function removeFromBench(
  candidateId: string,
  userId: string,
  reason: string
): Promise<ApiResponse<Candidate>> {
  try {
    // Update candidate status
    const result = await updateCandidate(
      candidateId,
      {
        bench_status: 'placed',
      },
      userId
    );

    if ('error' in result) {
      return result;
    }

    const data = result.data;

    // Update bench history
    const { data: benchHistory, error: historyError } = await supabase
      .from('bench_history')
      .select('*')
      .eq('candidate_id', candidateId)
      .is('bench_removed_date', null)
      .order('bench_added_date', { ascending: false })
      .limit(1)
      .single();

    if (!historyError && benchHistory) {
      const history = benchHistory as Database['public']['Tables']['bench_history']['Row'];
      await typedUpdate('bench_history', 'bench_id', history.bench_id, {
        bench_removed_date: new Date().toISOString().split('T')[0],
        reason_bench_out: reason,
      });
    }

    // Create activity
    await createActivity({
      entityType: 'candidate',
      entityId: candidateId,
      activityType: 'bench',
      activityTitle: 'Removed from Bench',
      activityDescription: reason,
      userId,
    });

    return { data };
  } catch (err) {
    return { error: 'Failed to remove candidate from bench' };
  }
}

/**
 * Search candidates by skills
 *
 * @param userId - Authenticated user ID (REQUIRED for team scoping)
 * @param skills - Skills to search for
 *
 * Security:
 * - Results are automatically scoped to user's team
 * - Master admin can search across all teams
 */
export async function searchCandidatesBySkills(
  userId: string,
  skills: string
): Promise<ApiArrayResponse<Candidate>> {
  try {
    // Apply team filtering
    const teamFilters = await applyTeamFilter(userId);

    let query = supabase
      .from('candidates')
      .select('*')
      .or(`skills_primary.ilike.%${skills}%,skills_secondary.ilike.%${skills}%`);

    // Apply team filter
    if (teamFilters.teamId) {
      query = query.eq('team_id', teamFilters.teamId);
    }

    query = query.order('total_experience_years', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return { error: error.message };
    }

    return { data: data as Candidate[] };
  } catch (err: any) {
    return { error: err.message || 'Failed to search candidates' };
  }
}
