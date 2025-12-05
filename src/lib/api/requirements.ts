import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { createAuditLog, createActivity } from '@/lib/utils/audit';
import type { Database } from '@/types/database';
import type { ApiResponse, ApiArrayResponse, ApiVoidResponse } from '@/types/api';

type JobRequirement = Database['public']['Tables']['job_requirements']['Row'];
type JobRequirementInsert = Database['public']['Tables']['job_requirements']['Insert'];
type JobRequirementUpdate = Database['public']['Tables']['job_requirements']['Update'];

type CreateJobRequirementResponse =
  | { data: JobRequirement; error?: never; duplicate: false }
  | { data?: never; error: string; duplicate?: false }
  | { data?: never; error?: never; duplicate: true; matches: any[] };

/**
 * Get all job requirements with optional filters
 */
export async function getJobRequirements(filters?: {
  search?: string;
  status?: string;
  clientId?: string;
  vendorId?: string;
  priority?: string;
}): Promise<ApiArrayResponse<any>> {
  try {
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

    const { data, error } = await query;

    if (error) {
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    return { error: 'Failed to fetch job requirements' };
  }
}

/**
 * Get a single job requirement by ID
 */
export async function getJobRequirementById(jobId: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
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

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    return { error: 'Failed to fetch job requirement' };
  }
}

/**
 * Check for duplicate job requirements
 */
async function checkDuplicateJobRequirement(jobTitle: string, clientId?: string, excludeJobId?: string): Promise<any[]> {
  try {
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
  } catch (error) {
    return [];
  }
}

/**
 * Create a new job requirement
 */
export async function createJobRequirement(
  jobData: JobRequirementInsert,
  userId?: string,
  teamId?: string,
  options?: { skipDuplicateCheck?: boolean }
): Promise<CreateJobRequirementResponse> {
  try {
    // Check for duplicates
    if (!options?.skipDuplicateCheck && jobData.job_title) {
      const duplicates = await checkDuplicateJobRequirement(jobData.job_title, jobData.client_id || undefined);
      if (duplicates.length > 0) {
        return {
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

    if (result.error) {
      return { error: result.error.message };
    }

    if (!result.data) {
      return { error: 'Failed to create job requirement' };
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

    return { data: result.data, duplicate: false };
  } catch (error) {
    return { error: 'Failed to create job requirement' };
  }
}

/**
 * Update a job requirement
 */
export async function updateJobRequirement(
  jobId: string,
  updates: JobRequirementUpdate,
  userId?: string,
  options?: { skipDuplicateCheck?: boolean }
): Promise<ApiResponse<JobRequirement> | { data?: never; error?: never; duplicate: true; matches: any[] }> {
  try {
    // Check for duplicates if job title is being changed
    if (!options?.skipDuplicateCheck && updates.job_title) {
      const duplicates = await checkDuplicateJobRequirement(updates.job_title, updates.client_id || undefined, jobId);
      if (duplicates.length > 0) {
        return {
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
      return { error: result.error.message };
    }

    if (!result.data) {
      return { error: 'Failed to update job requirement' };
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

    return { data: result.data };
  } catch (error) {
    return { error: 'Failed to update job requirement' };
  }
}

/**
 * Delete a job requirement
 */
export async function deleteJobRequirement(jobId: string, userId?: string): Promise<ApiVoidResponse> {
  try {
    const { error } = await supabase
      .from('job_requirements')
      .delete()
      .eq('job_id', jobId);

    if (error) {
      return { error: error.message };
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

    return { data: true };
  } catch (error) {
    return { error: 'Failed to delete job requirement' };
  }
}

/**
 * Get submissions for a job requirement
 */
export async function getJobSubmissions(jobId: string): Promise<ApiArrayResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        candidate:candidates(candidate_id, first_name, last_name, email_address, phone_number, skills_primary)
      `)
      .eq('job_id', jobId)
      .order('submitted_at', { ascending: false });

    if (error) {
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    return { error: 'Failed to fetch job submissions' };
  }
}

/**
 * Get matching candidates for a job requirement
 */
export async function getMatchingCandidates(jobId: string): Promise<ApiArrayResponse<any>> {
  try {
    // Get the job requirement
    const jobResult = await getJobRequirementById(jobId);

    if ('error' in jobResult && jobResult.error) {
      return { error: jobResult.error };
    }

    if (!('data' in jobResult) || !jobResult.data) {
      return { error: 'Failed to retrieve job requirement' };
    }

    const job = jobResult.data;

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

    const { data, error } = await query.limit(20);

    if (error) {
      return { error: error.message || 'Failed to fetch matching candidates' };
    }

    return { data: data || [] };
  } catch (error) {
    return { error: 'Failed to fetch matching candidates' };
  }
}
