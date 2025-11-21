import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { createActivity } from '@/lib/utils/audit';

export async function getInterviews(filters?: {
  search?: string;
  submissionId?: string;
  result?: string;
  fromDate?: string;
  toDate?: string;
}) {
  let query = supabase
    .from('interviews')
    .select(`
      *,
      submission:submissions(
        submission_id,
        candidate:candidates(candidate_id, first_name, last_name, email_address),
        job:job_requirements(job_id, job_title, client:clients(client_name))
      )
    `)
    .order('scheduled_time', { ascending: false });

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

  return await query;
}

export async function getInterviewById(id: string) {
  return await supabase
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
}

export async function createInterview(data: any, userId?: string) {
  const result = await typedInsert('interviews', { ...data, created_by: userId });

  if (result.data && userId) {
    await createActivity({
      entityType: 'interviews',
      entityId: result.data.interview_id,
      activityType: 'created',
      activityTitle: 'Interview Scheduled',
      activityDescription: `Interview scheduled for ${data.scheduled_time}`,
      userId,
    });
  }

  return result;
}

export async function updateInterview(id: string, updates: any, userId?: string) {
  const result = await typedUpdate('interviews', 'interview_id', id, { ...updates, updated_by: userId });

  if (result.data && userId) {
    await createActivity({
      entityType: 'interviews',
      entityId: id,
      activityType: 'updated',
      activityTitle: 'Interview Updated',
      activityDescription: 'Interview information was updated',
      userId,
    });
  }

  return result;
}

export async function deleteInterview(id: string, userId?: string) {
  const result = await supabase
    .from('interviews')
    .delete()
    .eq('interview_id', id);

  if (!result.error && userId) {
    await createActivity({
      entityType: 'interviews',
      entityId: id,
      activityType: 'deleted',
      activityTitle: 'Interview Cancelled',
      activityDescription: 'Interview was cancelled',
      userId,
    });
  }

  return result;
}

export async function getUpcomingInterviews(days: number = 7) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  return await supabase
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
}
