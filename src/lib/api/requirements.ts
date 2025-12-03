import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { createAuditLog, createActivity } from '@/lib/utils/audit';
import type { Database } from '@/types/database';

type JobRequirement = Database['public']['Tables']['job_requirements']['Row'];
type JobRequirementInsert = Database['public']['Tables']['job_requirements']['Insert'];
type JobRequirementUpdate = Database['public']['Tables']['job_requirements']['Update'];

/**
 * Get all job requirements with optional filters
 */
export async function getJobRequirements(filters?: {
  search?: string;
  status?: string;
  clientId?: string;
  vendorId?: string;
  priority?: string;
}) {
  let query = supabase
    .from('job_requirements')
    .select(`
      *,
      vendor:vendors(vendor_id, vendor_name),
      client:clients(client_id, client_name),
      created_by_user:users!job_requirements_created_by_fkey(username, email),
      updated_by_user:users!job_requirements_updated_by_fkey(username, email)
    `)
    .order('created_at', { ascending: false });

  if (filters?.search) {
    query = query.or(`job_title.ilike.%${filters.search}%,job_description.ilike.%${filters.search}%,skills_required.ilike.%${filters.search}%`);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId);
  }

  if (filters?.vendorId) {
    query = query.eq('vendor_id', filters.vendorId);
  }

  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }

  return await query;
}

/**
 * Get a single job requirement by ID
 */
export async function getJobRequirementById(jobId: string) {
  return await supabase
    .from('job_requirements')
    .select(`
      *,
      vendor:vendors(vendor_id, vendor_name, contact_name, contact_email, contact_phone),
      client:clients(client_id, client_name, primary_contact_name, primary_contact_email, primary_contact_phone),
      created_by_user:users!job_requirements_created_by_fkey(username, email),
      updated_by_user:users!job_requirements_updated_by_fkey(username, email)
    `)
    .eq('job_id', jobId)
    .single();
}

/**
 * Check for duplicate job requirements
 */
async function checkDuplicateJobRequirement(jobTitle: string, clientId?: string, excludeJobId?: string) {
  let query = supabase
    .from('job_requirements')
    .select('job_id, job_title, client_id')
    .ilike('job_title', `%${jobTitle}%`);

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  if (excludeJobId) {
    query = query.neq('job_id', excludeJobId);
  }

  const { data } = await query.limit(5);
  return data || [];
}

/**
 * Create a new job requirement
 */
export async function createJobRequirement(
  jobData: JobRequirementInsert,
  userId?: string,
  teamId?: string,
  options?: { skipDuplicateCheck?: boolean }
) {
  // Check for duplicates
  if (!options?.skipDuplicateCheck && jobData.job_title) {
    const duplicates = await checkDuplicateJobRequirement(jobData.job_title, jobData.client_id || undefined);
    if (duplicates.length > 0) {
      return {
        data: null,
        error: null,
        duplicate: true,
        matches: duplicates,
      };
    }
  }

  const insertData: JobRequirementInsert = {
    ...jobData,
    created_by: userId || null,
    updated_by: userId || null,
    team_id: teamId || null,
  };

  const result = await typedInsert('job_requirements', insertData);

  if (result.error || !result.data) {
    return { data: null, error: result.error };
  }

  // Create audit log
  if (userId) {
    await createAuditLog({
      entityName: 'job_requirements',
      entityId: result.data.job_id,
      action: 'CREATE',
      newValue: jobData,
      userId,
    });

    // Create activity
    await createActivity({
      entityType: 'job_requirement',
      entityId: result.data.job_id,
      activityType: 'created',
      activityTitle: 'Job Requirement Created',
      activityDescription: `Job requirement "${jobData.job_title}" was created`,
      userId,
    });
  }

  return { data: result.data, error: null };
}

/**
 * Update a job requirement
 */
export async function updateJobRequirement(
  jobId: string,
  updates: JobRequirementUpdate,
  userId?: string,
  options?: { skipDuplicateCheck?: boolean }
) {
  // Check for duplicates if job title is being changed
  if (!options?.skipDuplicateCheck && updates.job_title) {
    const duplicates = await checkDuplicateJobRequirement(updates.job_title, updates.client_id || undefined, jobId);
    if (duplicates.length > 0) {
      return {
        data: null,
        error: null,
        duplicate: true,
        matches: duplicates,
      };
    }
  }

  const result = await typedUpdate('job_requirements', 'job_id', jobId, {
    ...updates,
    updated_by: userId || null,
  });

  if (result.error) {
    return { data: null, error: result.error };
  }

  // Create audit log
  if (userId) {
    await createAuditLog({
      entityName: 'job_requirements',
      entityId: jobId,
      action: 'UPDATE',
      newValue: updates,
      userId,
    });

    // Create activity
    await createActivity({
      entityType: 'job_requirement',
      entityId: jobId,
      activityType: 'updated',
      activityTitle: 'Job Requirement Updated',
      activityDescription: 'Job requirement information was updated',
      userId,
    });
  }

  return { data: result.data, error: null };
}

/**
 * Delete a job requirement
 */
export async function deleteJobRequirement(jobId: string, userId?: string) {
  const result = await supabase
    .from('job_requirements')
    .delete()
    .eq('job_id', jobId);

  if (result.error) {
    return { data: null, error: result.error };
  }

  // Create audit log
  if (userId) {
    await createAuditLog({
      entityName: 'job_requirements',
      entityId: jobId,
      action: 'DELETE',
      userId,
    });
  }

  return { data: true, error: null };
}

/**
 * Get submissions for a job requirement
 */
export async function getJobSubmissions(jobId: string) {
  return await supabase
    .from('submissions')
    .select(`
      *,
      candidate:candidates(candidate_id, first_name, last_name, email_address, phone_number, skills_primary)
    `)
    .eq('job_id', jobId)
    .order('submitted_at', { ascending: false });
}

/**
 * Get matching candidates for a job requirement
 */
export async function getMatchingCandidates(jobId: string) {
  // Get the job requirement
  const { data: job } = await getJobRequirementById(jobId);

  if (!job) {
    return { data: [], error: null };
  }

  // Type assertion for the job data (Supabase returns complex nested types from joins)
  const jobData = job as JobRequirement;

  // Search for candidates with matching skills
  let query = supabase
    .from('candidates')
    .select('*')
    .eq('bench_status', 'available');

  // If skills are specified, search for them
  if (jobData.skills_required) {
    const skills = jobData.skills_required.split(',').map((s: string) => s.trim());
    const skillQuery = skills.map((skill: string) =>
      `skills_primary.ilike.%${skill}%,skills_secondary.ilike.%${skill}%`
    ).join(',');

    if (skillQuery) {
      query = query.or(skillQuery);
    }
  }

  return await query.limit(20);
}
