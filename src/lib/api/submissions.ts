import { supabase } from '@/lib/supabase/client';
import { createAuditLog, createActivity } from '@/lib/utils/audit';

/**
 * Get all submissions with optional filters
 */
export async function getSubmissions(filters?: {
  candidateId?: string;
  jobId?: string;
  status?: string;
  search?: string;
}) {
  let query = supabase
    .from('submissions')
    .select(`
      *,
      candidate:candidates(candidate_id, first_name, last_name, email_address, phone_number, skills_primary, visa_status_id),
      job:job_requirements(job_id, job_title, location, work_mode, employment_type, client_id, vendor_id),
      client:job_requirements(client:clients(client_id, client_name)),
      vendor:job_requirements(vendor:vendors(vendor_id, vendor_name)),
      submitted_by:users(username, email)
    `)
    .order('submitted_at', { ascending: false });

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

  return await query;
}

/**
 * Get a single submission by ID
 */
export async function getSubmissionById(submissionId: string) {
  return await supabase
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
}

/**
 * Create a new submission
 */
export async function createSubmission(
  submissionData: any,
  userId?: string
) {
  const result = await supabase
    .from('submissions')
    .insert([{
      ...submissionData,
      submitted_by_user_id: userId,
    }])
    .select()
    .single();

  if (result.error) {
    return { data: null, error: result.error };
  }

  // Create audit log
  if (userId) {
    await createAuditLog({
      entityName: 'submissions',
      entityId: result.data.submission_id,
      action: 'created',
      changes: submissionData,
      performedBy: userId,
    });

    // Create activity
    await createActivity({
      entityType: 'submission',
      entityId: result.data.submission_id,
      activityType: 'created',
      activityTitle: 'Submission Created',
      activityDescription: `Candidate submitted for job requirement`,
      createdBy: userId,
    });
  }

  return { data: result.data, error: null };
}

/**
 * Update a submission
 */
export async function updateSubmission(
  submissionId: string,
  updates: any,
  userId?: string
) {
  const result = await supabase
    .from('submissions')
    .update(updates)
    .eq('submission_id', submissionId)
    .select()
    .single();

  if (result.error) {
    return { data: null, error: result.error };
  }

  // Create audit log
  if (userId) {
    await createAuditLog({
      entityName: 'submissions',
      entityId: submissionId,
      action: 'updated',
      changes: updates,
      performedBy: userId,
    });

    // Create activity for status changes
    if (updates.submission_status) {
      await createActivity({
        entityType: 'submission',
        entityId: submissionId,
        activityType: 'status_changed',
        activityTitle: 'Status Updated',
        activityDescription: `Submission status changed to ${updates.submission_status}`,
        createdBy: userId,
      });
    }
  }

  return { data: result.data, error: null };
}

/**
 * Delete a submission
 */
export async function deleteSubmission(submissionId: string, userId?: string) {
  const result = await supabase
    .from('submissions')
    .delete()
    .eq('submission_id', submissionId);

  if (result.error) {
    return { data: null, error: result.error };
  }

  // Create audit log
  if (userId) {
    await createAuditLog({
      entityName: 'submissions',
      entityId: submissionId,
      action: 'deleted',
      changes: {},
      performedBy: userId,
    });
  }

  return { data: true, error: null };
}

/**
 * Get submission pipeline statistics
 */
export async function getSubmissionStats() {
  const { data, error } = await supabase
    .from('submissions')
    .select('submission_status');

  if (error || !data) {
    return {
      total: 0,
      byStatus: {},
    };
  }

  const byStatus = data.reduce((acc: any, submission: any) => {
    const status = submission.submission_status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return {
    total: data.length,
    byStatus,
  };
}

/**
 * Get interviews for a submission
 */
export async function getSubmissionInterviews(submissionId: string) {
  return await supabase
    .from('interviews')
    .select('*')
    .eq('submission_id', submissionId)
    .order('scheduled_time', { ascending: false });
}

/**
 * Update submission status
 */
export async function updateSubmissionStatus(
  submissionId: string,
  newStatus: string,
  userId?: string,
  notes?: string
) {
  const updates: any = {
    submission_status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (notes) {
    updates.notes = notes;
  }

  return await updateSubmission(submissionId, updates, userId);
}
