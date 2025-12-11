import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { createAuditLog, createActivity } from '@/lib/utils/audit';
import type { Database } from '@/types/database';
import type { ApiResponse, ApiArrayResponse, ApiVoidResponse } from '@/types/api';

type Submission = Database['public']['Tables']['submissions']['Row'];
type SubmissionInsert = Database['public']['Tables']['submissions']['Insert'];
type SubmissionUpdate = Database['public']['Tables']['submissions']['Update'];

/**
 * Get all submissions with optional filters
 * @param filters.teamId - Filter by team (for master admin)
 * @param filters.userTeamId - Current user's team ID (for non-master admin filtering)
 * @param filters.isMasterAdmin - Whether current user is master admin
 */
export async function getSubmissions(filters?: {
  candidateId?: string;
  jobId?: string;
  status?: string;
  search?: string;
  teamId?: string;
  userTeamId?: string;
  isMasterAdmin?: boolean;
}): Promise<ApiArrayResponse<any>> {
  try {
    let query = supabase
      .from('submissions')
      .select(`
        *,
        candidate:candidates(candidate_id, first_name, last_name, email_address, phone_number, skills_primary, visa_status_id),
        job:job_requirements(job_id, job_title, location, work_mode, employment_type, client_id, vendor_id),
        client:job_requirements(client:clients(client_id, client_name)),
        vendor:job_requirements(vendor:vendors(vendor_id, vendor_name)),
        submitted_by:users(username, email),
        team:team_id(team_id, team_name, company_name)
      `)
      .order('submitted_at', { ascending: false });

    // Team filtering logic
    if (filters?.isMasterAdmin) {
      if (filters?.teamId) {
        query = query.eq('team_id', filters.teamId);
      }
    } else if (filters?.userTeamId) {
      query = query.eq('team_id', filters.userTeamId);
    }

    if (filters?.candidateId) {
      query = query.eq('candidate_id', filters.candidateId);
    }

    if (filters?.jobId) {
      query = query.eq('job_id', filters.jobId);
    }

    if (filters?.status) {
      query = query.eq('submission_status', filters.status);
    }

    if (filters?.search) {
      // Search in candidate name or job title (need to use joins)
      query = query.or(`candidate.first_name.ilike.%${filters.search}%,candidate.last_name.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    return { error: 'Failed to fetch submissions' };
  }
}

/**
 * Get a single submission by ID
 */
export async function getSubmissionById(submissionId: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        candidate:candidates(
          candidate_id,
          first_name,
          last_name,
          email_address,
          phone_number,
          linkedin_url,
          skills_primary,
          skills_secondary,
          total_experience_years,
          hourly_pay_rate,
          visa_status_id,
          bench_status
        ),
        job:job_requirements(
          job_id,
          job_title,
          job_description,
          skills_required,
          location,
          work_mode,
          employment_type,
          bill_rate_range_min,
          bill_rate_range_max,
          status,
          priority,
          client_id,
          vendor_id
        ),
        client:job_requirements(client:clients(client_id, client_name, primary_contact_name, primary_contact_email)),
        vendor:job_requirements(vendor:vendors(vendor_id, vendor_name, contact_name, contact_email)),
        submitted_by:users(user_id, username, email)
      `)
      .eq('submission_id', submissionId)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    return { error: 'Failed to fetch submission' };
  }
}

/**
 * Create a new submission
 */
export async function createSubmission(
  submissionData: SubmissionInsert,
  userId?: string,
  teamId?: string
): Promise<ApiResponse<Submission>> {
  try {
    const insertData = {
      ...submissionData,
      submitted_by_user_id: userId || null,
      team_id: teamId || null,
    } as any;

    const result = await typedInsert('submissions', insertData as any);

    if (result.error) {
      return { error: result.error.message };
    }

    if (!result.data) {
      return { error: 'Failed to create submission' };
    }

    // Create audit log
    if (userId) {
      await createAuditLog({
        entityName: 'submissions',
        entityId: result.data.submission_id,
        action: 'CREATE',
        newValue: submissionData,
        userId,
      });

      // Create activity
      await createActivity({
        entityType: 'submission',
        entityId: result.data.submission_id,
        activityType: 'created',
        activityTitle: 'Submission Created',
        activityDescription: `Candidate submitted for job requirement`,
        userId,
      });
    }

    return { data: result.data };
  } catch (error) {
    return { error: 'Failed to create submission' };
  }
}

/**
 * Update a submission
 */
export async function updateSubmission(
  submissionId: string,
  updates: SubmissionUpdate,
  userId?: string
): Promise<ApiResponse<Submission>> {
  try {
    const result = await typedUpdate('submissions', 'submission_id', submissionId, updates);

    if (result.error) {
      return { error: result.error.message };
    }

    if (!result.data) {
      return { error: 'Failed to update submission' };
    }

    // Create audit log
    if (userId) {
      await createAuditLog({
        entityName: 'submissions',
        entityId: submissionId,
        action: 'UPDATE',
        newValue: updates,
        userId,
      });

      // Create activity for status changes
      if ((updates as any).submission_status || (updates as any).status) {
        const status = (updates as any).submission_status || (updates as any).status;
        await createActivity({
          entityType: 'submission',
          entityId: submissionId,
          activityType: 'status_changed',
          activityTitle: 'Status Updated',
          activityDescription: `Submission status changed to ${status}`,
          userId,
        });
      }
    }

    return { data: result.data };
  } catch (error) {
    return { error: 'Failed to update submission' };
  }
}

/**
 * Delete a submission
 */
export async function deleteSubmission(submissionId: string, userId?: string): Promise<ApiVoidResponse> {
  try {
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('submission_id', submissionId);

    if (error) {
      return { error: error.message };
    }

    // Create audit log
    if (userId) {
      await createAuditLog({
        entityName: 'submissions',
        entityId: submissionId,
        action: 'DELETE',
        userId,
      });
    }

    return { data: true };
  } catch (error) {
    return { error: 'Failed to delete submission' };
  }
}

/**
 * Get submission pipeline statistics
 */
export async function getSubmissionStats(): Promise<ApiResponse<{ total: number; byStatus: Record<string, number> }>> {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('submission_status');

    if (error) {
      return { error: error.message };
    }

    if (!data) {
      return {
        data: {
          total: 0,
          byStatus: {},
        },
      };
    }

    const byStatus = data.reduce((acc: any, submission: any) => {
      const status = submission.submission_status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      data: {
        total: data.length,
        byStatus,
      },
    };
  } catch (error) {
    return { error: 'Failed to fetch submission statistics' };
  }
}

/**
 * Get interviews for a submission
 */
export async function getSubmissionInterviews(submissionId: string): Promise<ApiArrayResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('submission_id', submissionId)
      .order('scheduled_time', { ascending: false });

    if (error) {
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    return { error: 'Failed to fetch submission interviews' };
  }
}

/**
 * Update submission status
 */
export async function updateSubmissionStatus(
  submissionId: string,
  newStatus: string,
  userId?: string,
  notes?: string
): Promise<ApiResponse<Submission>> {
  try {
    const updates: any = {
      submission_status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (notes) {
      updates.notes = notes;
    }

    return await updateSubmission(submissionId, updates, userId);
  } catch (error) {
    return { error: 'Failed to update submission status' };
  }
}
