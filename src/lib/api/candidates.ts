/**
 * Candidate API Functions
 */

import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { findDuplicateCandidates, mergeCandidateData } from '@/lib/utils/deduplication';
import { createAuditLog, createActivity } from '@/lib/utils/audit';
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
 * @param filters.teamId - Filter by team (for master admin). If not provided, master admin sees all.
 * @param filters.userTeamId - Current user's team ID (for non-master admin filtering)
 * @param filters.isMasterAdmin - Whether current user is master admin
 */
export async function getCandidates(filters?: {
  search?: string;
  benchStatus?: string;
  visaStatus?: string;
  limit?: number;
  offset?: number;
  teamId?: string;
  userTeamId?: string;
  isMasterAdmin?: boolean;
}): Promise<ApiResponse<CandidatesWithCount>> {
  try {
    let query = supabase
      .from('candidates')
      .select(`
        *,
        visa_status:visa_status(visa_name),
        sales_manager:sales_manager_id(username),
        recruiter_manager:recruiter_manager_id(username),
        team:team_id(team_id, team_name, company_name)
      `, { count: 'exact' });

    // Team filtering logic
    if (filters?.isMasterAdmin) {
      // Master admin can filter by specific team or see all
      if (filters?.teamId) {
        query = query.eq('team_id', filters.teamId);
      }
      // If no teamId specified, master admin sees all teams
    } else if (filters?.userTeamId) {
      // Regular users only see their team's data
      query = query.eq('team_id', filters.userTeamId);
    }

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
 */
export async function createCandidate(
  candidateData: CandidateInsert,
  userId?: string,
  options?: { skipDuplicateCheck?: boolean }
): Promise<CreateCandidateResponse> {
  try {
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

    // Create new candidate
    const { data, error } = await typedInsert('candidates', {
      ...candidateData,
      created_by: userId || null,
      updated_by: userId || null,
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
  } catch (err) {
    return { error: 'Failed to create candidate' };
  }
}

/**
 * Update an existing candidate
 */
export async function updateCandidate(
  candidateId: string,
  updates: CandidateUpdate,
  userId?: string
): Promise<ApiResponse<Candidate>> {
  try {
    // Get current data for audit log
    const oldDataResult = await getCandidateById(candidateId);
    const oldData = 'data' in oldDataResult ? oldDataResult.data : null;

    // Update candidate
    const { data, error } = await typedUpdate('candidates', 'candidate_id', candidateId, {
      ...updates,
      updated_by: userId || null,
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
 */
export async function mergeCandidate(
  existingCandidateId: string,
  newData: Partial<CandidateInsert>,
  userId?: string
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

    // Merge data
    const merged = mergeCandidateData(existing, newData);

    // Update with merged data
    return updateCandidate(existingCandidateId, merged, userId);
  } catch (err) {
    return { error: 'Failed to merge candidate data' };
  }
}

/**
 * Delete a candidate
 */
export async function deleteCandidate(candidateId: string, userId?: string): Promise<ApiVoidResponse> {
  try {
    // Get data for audit log
    const candidateResult = await getCandidateById(candidateId);
    const candidateData = 'data' in candidateResult ? candidateResult.data : null;

    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('candidate_id', candidateId);

    if (error) {
      return { error: error.message };
    }

    if (candidateData) {
      // Create audit log
      await createAuditLog({
        entityName: 'candidates',
        entityId: candidateId,
        action: 'DELETE',
        oldValue: candidateData,
        userId,
      });
    }

    return { data: true };
  } catch (err) {
    return { error: 'Failed to delete candidate' };
  }
}

/**
 * Get candidates on bench
 */
export async function getBenchCandidates(): Promise<ApiResponse<CandidatesWithCount>> {
  return getCandidates({ benchStatus: 'on_bench' });
}

/**
 * Get available candidates
 */
export async function getAvailableCandidates(): Promise<ApiResponse<CandidatesWithCount>> {
  return getCandidates({ benchStatus: 'available' });
}

/**
 * Add candidate to bench
 */
export async function addToBench(
  candidateId: string,
  notes?: string,
  userId?: string
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
  reason: string,
  userId?: string
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
 */
export async function searchCandidatesBySkills(skills: string): Promise<ApiArrayResponse<Candidate>> {
  try {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .or(`skills_primary.ilike.%${skills}%,skills_secondary.ilike.%${skills}%`)
      .order('total_experience_years', { ascending: false });

    if (error) {
      return { error: error.message };
    }

    return { data: data as Candidate[] };
  } catch (err) {
    return { error: 'Failed to search candidates' };
  }
}
