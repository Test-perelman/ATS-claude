/**
 * Candidate API Functions
 */

import { supabase } from '@/lib/supabase/client';
import { findDuplicateCandidates, mergeCandidateData } from '@/lib/utils/deduplication';
import { createAuditLog, createActivity } from '@/lib/utils/audit';
import type { Database } from '@/types/database';

type Candidate = Database['public']['Tables']['candidates']['Row'];
type CandidateInsert = Database['public']['Tables']['candidates']['Insert'];
type CandidateUpdate = Database['public']['Tables']['candidates']['Update'];

/**
 * Get all candidates with filters
 */
export async function getCandidates(filters?: {
  search?: string;
  benchStatus?: string;
  visaStatus?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('candidates')
    .select(`
      *,
      visa_status:visa_status(visa_name),
      sales_manager:sales_manager_id(username),
      recruiter_manager:recruiter_manager_id(username)
    `, { count: 'exact' });

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

  return { data, error, count };
}

/**
 * Get candidate by ID
 */
export async function getCandidateById(candidateId: string) {
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

  return { data, error };
}

/**
 * Create a new candidate with deduplication
 */
export async function createCandidate(
  candidateData: CandidateInsert,
  userId?: string,
  options?: { skipDuplicateCheck?: boolean }
) {
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
        data: null,
        error: null,
        duplicate: true,
        matches: duplicateCheck.matches,
        matchType: duplicateCheck.matchType,
      };
    }
  }

  // Create new candidate
  const { data, error } = await supabase
    .from('candidates')
    .insert({
      ...candidateData,
      created_by: userId || null,
      updated_by: userId || null,
    })
    .select()
    .single();

  if (data && !error) {
    // Create audit log
    await createAuditLog({
      entityName: 'candidates',
      entityId: data.candidate_id,
      action: 'CREATE',
      newValue: data,
      userId,
    });

    // Create activity
    await createActivity({
      entityType: 'candidate',
      entityId: data.candidate_id,
      activityType: 'created',
      activityTitle: 'Candidate Created',
      activityDescription: `${data.first_name} ${data.last_name} was added to the system`,
      userId,
    });
  }

  return { data, error, duplicate: false };
}

/**
 * Update an existing candidate
 */
export async function updateCandidate(
  candidateId: string,
  updates: CandidateUpdate,
  userId?: string
) {
  // Get current data for audit log
  const { data: oldData } = await getCandidateById(candidateId);

  // Update candidate
  const { data, error } = await supabase
    .from('candidates')
    .update({
      ...updates,
      updated_by: userId || null,
    })
    .eq('candidate_id', candidateId)
    .select()
    .single();

  if (data && !error) {
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

  return { data, error };
}

/**
 * Merge candidate data with existing record
 */
export async function mergeCandidate(
  existingCandidateId: string,
  newData: Partial<CandidateInsert>,
  userId?: string
) {
  // Get existing candidate
  const { data: existing } = await getCandidateById(existingCandidateId);

  if (!existing) {
    return { data: null, error: { message: 'Candidate not found' } };
  }

  // Merge data
  const merged = mergeCandidateData(existing, newData);

  // Update with merged data
  return updateCandidate(existingCandidateId, merged, userId);
}

/**
 * Delete a candidate
 */
export async function deleteCandidate(candidateId: string, userId?: string) {
  // Get data for audit log
  const { data: candidateData } = await getCandidateById(candidateId);

  const { data, error } = await supabase
    .from('candidates')
    .delete()
    .eq('candidate_id', candidateId);

  if (!error && candidateData) {
    // Create audit log
    await createAuditLog({
      entityName: 'candidates',
      entityId: candidateId,
      action: 'DELETE',
      oldValue: candidateData,
      userId,
    });
  }

  return { data, error };
}

/**
 * Get candidates on bench
 */
export async function getBenchCandidates() {
  return getCandidates({ benchStatus: 'on_bench' });
}

/**
 * Get available candidates
 */
export async function getAvailableCandidates() {
  return getCandidates({ benchStatus: 'available' });
}

/**
 * Add candidate to bench
 */
export async function addToBench(
  candidateId: string,
  notes?: string,
  userId?: string
) {
  // Update candidate status
  const { data, error } = await updateCandidate(
    candidateId,
    {
      bench_status: 'on_bench',
      bench_added_date: new Date().toISOString().split('T')[0],
    },
    userId
  );

  if (!error) {
    // Add to bench history
    await supabase.from('bench_history').insert({
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
  }

  return { data, error };
}

/**
 * Remove candidate from bench
 */
export async function removeFromBench(
  candidateId: string,
  reason: string,
  userId?: string
) {
  // Update candidate status
  const { data, error } = await updateCandidate(
    candidateId,
    {
      bench_status: 'placed',
    },
    userId
  );

  if (!error) {
    // Update bench history
    const { data: benchHistory } = await supabase
      .from('bench_history')
      .select('*')
      .eq('candidate_id', candidateId)
      .is('bench_removed_date', null)
      .order('bench_added_date', { ascending: false })
      .limit(1)
      .single();

    if (benchHistory) {
      await supabase
        .from('bench_history')
        .update({
          bench_removed_date: new Date().toISOString().split('T')[0],
          reason_bench_out: reason,
        })
        .eq('bench_id', benchHistory.bench_id);
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
  }

  return { data, error };
}

/**
 * Search candidates by skills
 */
export async function searchCandidatesBySkills(skills: string) {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .or(`skills_primary.ilike.%${skills}%,skills_secondary.ilike.%${skills}%`)
    .order('total_experience_years', { ascending: false });

  return { data, error };
}
