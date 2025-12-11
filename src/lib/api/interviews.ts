import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { createActivity } from '@/lib/utils/audit';
import type { Database } from '@/types/database';
import type { ApiResponse, ApiArrayResponse, ApiVoidResponse } from '@/types/api';

type Interview = Database['public']['Tables']['interviews']['Row'];
type InterviewInsert = Database['public']['Tables']['interviews']['Insert'];
type InterviewUpdate = Database['public']['Tables']['interviews']['Update'];

/**
 * Get all interviews with optional filters
 * @param filters.teamId - Filter by team (for master admin)
 * @param filters.userTeamId - Current user's team ID (for non-master admin filtering)
 * @param filters.isMasterAdmin - Whether current user is master admin
 */
export async function getInterviews(filters?: {
  search?: string;
  submissionId?: string;
  result?: string;
  fromDate?: string;
  toDate?: string;
  teamId?: string;
  userTeamId?: string;
  isMasterAdmin?: boolean;
}): Promise<ApiArrayResponse<any>> {
  try {
    let query = supabase
      .from('interviews')
      .select(`
        *,
        submission:submissions(
          submission_id,
          candidate:candidates(candidate_id, first_name, last_name, email_address),
          job:job_requirements(job_id, job_title, client:clients(client_name))
        ),
        team:team_id(team_id, team_name, company_name)
      `)
      .order('scheduled_time', { ascending: false });

    // Team filtering logic
    if (filters?.isMasterAdmin) {
      if (filters?.teamId) {
        query = query.eq('team_id', filters.teamId);
      }
    } else if (filters?.userTeamId) {
      query = query.eq('team_id', filters.userTeamId);
    }

    if (filters?.submissionId) {
      query = query.eq('submission_id', filters.submissionId);
    }

    if (filters?.result) {
      query = query.eq('result', filters.result);
    }

    if (filters?.fromDate) {
      query = query.gte('scheduled_time', filters.fromDate);
    }

    if (filters?.toDate) {
      query = query.lte('scheduled_time', filters.toDate);
    }

    const { data, error } = await query;

    if (error) {
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    return { error: 'Failed to fetch interviews' };
  }
}

export async function getInterviewById(id: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('interviews')
      .select(`
        *,
        submission:submissions(
          submission_id,
          candidate:candidates(candidate_id, first_name, last_name, email_address, phone_number),
          job:job_requirements(job_id, job_title, client:clients(client_name))
        )
      `)
      .eq('interview_id', id)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    return { error: 'Failed to fetch interview' };
  }
}

export async function createInterview(data: InterviewInsert, userId?: string, teamId?: string): Promise<ApiResponse<Interview>> {
  try {
    const result = await typedInsert('interviews', { ...data, created_by: userId, team_id: teamId || null } as any);

    if (result.error) {
      return { error: result.error.message };
    }

    if (!result.data) {
      return { error: 'Failed to create interview' };
    }

    if (userId) {
      await createActivity({
        entityType: 'interviews',
        entityId: result.data.interview_id,
        activityType: 'created',
        activityTitle: 'Interview Scheduled',
        activityDescription: `Interview scheduled for ${(data as any).scheduled_time || (data as any).scheduled_at}`,
        userId,
      });
    }

    return { data: result.data };
  } catch (error) {
    return { error: 'Failed to create interview' };
  }
}

export async function updateInterview(id: string, updates: InterviewUpdate, userId?: string): Promise<ApiResponse<Interview>> {
  try {
    const result = await typedUpdate('interviews', 'interview_id', id, { ...updates, updated_by: userId } as any);

    if (result.error) {
      return { error: result.error.message };
    }

    if (!result.data) {
      return { error: 'Failed to update interview' };
    }

    if (userId) {
      await createActivity({
        entityType: 'interviews',
        entityId: id,
        activityType: 'updated',
        activityTitle: 'Interview Updated',
        activityDescription: 'Interview information was updated',
        userId,
      });
    }

    return { data: result.data };
  } catch (error) {
    return { error: 'Failed to update interview' };
  }
}

export async function deleteInterview(id: string, userId?: string): Promise<ApiVoidResponse> {
  try {
    const { error } = await supabase
      .from('interviews')
      .delete()
      .eq('interview_id', id);

    if (error) {
      return { error: error.message };
    }

    if (userId) {
      await createActivity({
        entityType: 'interviews',
        entityId: id,
        activityType: 'deleted',
        activityTitle: 'Interview Cancelled',
        activityDescription: 'Interview was cancelled',
        userId,
      });
    }

    return { data: true };
  } catch (error) {
    return { error: 'Failed to delete interview' };
  }
}

export async function getUpcomingInterviews(days: number = 7): Promise<ApiArrayResponse<any>> {
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const { data, error } = await supabase
      .from('interviews')
      .select(`
        *,
        submission:submissions(
          candidate:candidates(first_name, last_name),
          job:job_requirements(job_title, client:clients(client_name))
        )
      `)
      .gte('scheduled_time', today.toISOString())
      .lte('scheduled_time', futureDate.toISOString())
      .order('scheduled_time', { ascending: true });

    if (error) {
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    return { error: 'Failed to fetch upcoming interviews' };
  }
}
