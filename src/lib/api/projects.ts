import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { createActivity } from '@/lib/utils/audit';
import type { Database } from '@/types/database';
import type { ApiResponse, ApiArrayResponse, ApiVoidResponse } from '@/types/api';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

/**
 * Get all projects with optional filters
 * @param filters.teamId - Filter by team (for master admin)
 * @param filters.userTeamId - Current user's team ID (for non-master admin filtering)
 * @param filters.isMasterAdmin - Whether current user is master admin
 */
export async function getProjects(filters?: {
  search?: string;
  status?: string;
  candidateId?: string;
  clientId?: string;
  teamId?: string;
  userTeamId?: string;
  isMasterAdmin?: boolean;
}): Promise<ApiArrayResponse<any>> {
  try {
    let query = supabase
      .from('projects')
      .select(`
        *,
        candidate:candidates(candidate_id, first_name, last_name, email_address),
        client:clients(client_id, client_name),
        vendor:vendors(vendor_id, vendor_name),
        team:team_id(team_id, team_name, company_name)
      `)
      .order('start_date', { ascending: false });

    // Team filtering logic
    if (filters?.isMasterAdmin) {
      if (filters?.teamId) {
        query = query.eq('team_id', filters.teamId);
      }
    } else if (filters?.userTeamId) {
      query = query.eq('team_id', filters.userTeamId);
    }

    if (filters?.search) {
      query = query.or(`project_name.ilike.%${filters.search}%`);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.candidateId) {
      query = query.eq('candidate_id', filters.candidateId);
    }

    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }

    const { data, error } = await query;

    if (error) {
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    return { error: 'Failed to fetch projects' };
  }
}

export async function getProjectById(id: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        candidate:candidates(candidate_id, first_name, last_name, email_address, phone_number),
        client:clients(client_id, client_name, primary_contact_name, primary_contact_email),
        vendor:vendors(vendor_id, vendor_name, contact_name, contact_email)
      `)
      .eq('project_id', id)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    return { error: 'Failed to fetch project' };
  }
}

export async function createProject(data: ProjectInsert, userId?: string, teamId?: string): Promise<ApiResponse<Project>> {
  try {
    const result = await typedInsert('projects', { ...data, created_by: userId, team_id: teamId || null });

    if (result.error) {
      return { error: result.error.message };
    }

    if (!result.data) {
      return { error: 'Failed to create project' };
    }

    if (userId) {
      await createActivity({
        entityType: 'projects',
        entityId: result.data.project_id,
        activityType: 'created',
        activityTitle: 'Project Created',
        activityDescription: `Project ${data.project_name} was created`,
        userId,
      });
    }

    return { data: result.data };
  } catch (error) {
    return { error: 'Failed to create project' };
  }
}

export async function updateProject(id: string, updates: ProjectUpdate, userId?: string): Promise<ApiResponse<Project>> {
  try {
    const result = await typedUpdate('projects', 'project_id', id, { ...updates, updated_by: userId });

    if (result.error) {
      return { error: result.error.message };
    }

    if (!result.data) {
      return { error: 'Failed to update project' };
    }

    if (userId) {
      await createActivity({
        entityType: 'projects',
        entityId: id,
        activityType: 'updated',
        activityTitle: 'Project Updated',
        activityDescription: 'Project information was updated',
        userId,
      });
    }

    return { data: result.data };
  } catch (error) {
    return { error: 'Failed to update project' };
  }
}

export async function deleteProject(id: string, userId?: string): Promise<ApiVoidResponse> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('project_id', id);

    if (error) {
      return { error: error.message };
    }

    if (userId) {
      await createActivity({
        entityType: 'projects',
        entityId: id,
        activityType: 'deleted',
        activityTitle: 'Project Deleted',
        activityDescription: 'Project was deleted',
        userId,
      });
    }

    return { data: true };
  } catch (error) {
    return { error: 'Failed to delete project' };
  }
}

export async function getActiveProjects(): Promise<ApiArrayResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        candidate:candidates(first_name, last_name),
        client:clients(client_name)
      `)
      .eq('status', 'Active')
      .order('start_date', { ascending: false });

    if (error) {
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    return { error: 'Failed to fetch active projects' };
  }
}

export async function getProjectRevenue(): Promise<ApiResponse<{ totalRevenue: number; totalCost: number; totalMargin: number }>> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('bill_rate_final, pay_rate_final, margin')
      .eq('status', 'Active');

    if (error) {
      return { error: error.message };
    }

    if (!data) {
      return {
        data: {
          totalRevenue: 0,
          totalCost: 0,
          totalMargin: 0,
        },
      };
    }

    const totalRevenue = data.reduce((sum, p: any) => sum + (parseFloat(p.bill_rate_final) || 0), 0);
    const totalCost = data.reduce((sum, p: any) => sum + (parseFloat(p.pay_rate_final) || 0), 0);
    const totalMargin = data.reduce((sum, p: any) => sum + (parseFloat(p.margin) || 0), 0);

    return {
      data: {
        totalRevenue,
        totalCost,
        totalMargin,
      },
    };
  } catch (error) {
    return { error: 'Failed to fetch project revenue' };
  }
}
