import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { createActivity } from '@/lib/utils/audit';
import type { Database } from '@/types/database';
import type { ApiResponse, ApiArrayResponse, ApiVoidResponse } from '@/types/api';

type Timesheet = Database['public']['Tables']['timesheets']['Row'];
type TimesheetInsert = Database['public']['Tables']['timesheets']['Insert'];
type TimesheetUpdate = Database['public']['Tables']['timesheets']['Update'];

export async function getTimesheets(filters?: {
  projectId?: string;
  candidateId?: string;
  approved?: boolean;
  weekStart?: string;
  weekEnd?: string;
}): Promise<ApiArrayResponse<any>> {
  try {
    let query = supabase
      .from('timesheets')
      .select(`
        *,
        project:projects(project_id, project_name, client:clients(client_name)),
        candidate:candidates(candidate_id, first_name, last_name)
      `)
      .order('week_start', { ascending: false });

    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    if (filters?.candidateId) {
      query = query.eq('candidate_id', filters.candidateId);
    }

    if (filters?.approved !== undefined) {
      query = query.eq('approved_by_client', filters.approved);
    }

    if (filters?.weekStart) {
      query = query.gte('week_start', filters.weekStart);
    }

    if (filters?.weekEnd) {
      query = query.lte('week_end', filters.weekEnd);
    }

    const { data, error } = await query;

    if (error) {
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    return { error: 'Failed to fetch timesheets' };
  }
}

export async function getTimesheetById(id: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('timesheets')
      .select(`
        *,
        project:projects(project_id, project_name, bill_rate_final, client:clients(client_name)),
        candidate:candidates(candidate_id, first_name, last_name, email_address)
      `)
      .eq('timesheet_id', id)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    return { error: 'Failed to fetch timesheet' };
  }
}

export async function createTimesheet(data: TimesheetInsert, userId?: string, teamId?: string): Promise<ApiResponse<Timesheet>> {
  try {
    const result = await typedInsert('timesheets', { ...data, created_by: userId, team_id: teamId || null });

    if (result.error) {
      return { error: result.error.message };
    }

    if (!result.data) {
      return { error: 'Failed to create timesheet' };
    }

    if (userId) {
      await createActivity({
        entityType: 'timesheets',
        entityId: result.data.timesheet_id,
        activityType: 'created',
        activityTitle: 'Timesheet Created',
        activityDescription: `Timesheet for week ${data.week_start} was created`,
        userId,
      });
    }

    return { data: result.data };
  } catch (error) {
    return { error: 'Failed to create timesheet' };
  }
}

export async function updateTimesheet(id: string, updates: TimesheetUpdate, userId?: string): Promise<ApiResponse<Timesheet>> {
  try {
    const result = await typedUpdate('timesheets', 'timesheet_id', id, { ...updates, updated_by: userId });

    if (result.error) {
      return { error: result.error.message };
    }

    if (!result.data) {
      return { error: 'Failed to update timesheet' };
    }

    if (userId) {
      await createActivity({
        entityType: 'timesheets',
        entityId: id,
        activityType: 'updated',
        activityTitle: 'Timesheet Updated',
        activityDescription: 'Timesheet was updated',
        userId,
      });
    }

    return { data: result.data };
  } catch (error) {
    return { error: 'Failed to update timesheet' };
  }
}

export async function deleteTimesheet(id: string, userId?: string): Promise<ApiVoidResponse> {
  try {
    const { error } = await supabase
      .from('timesheets')
      .delete()
      .eq('timesheet_id', id);

    if (error) {
      return { error: error.message };
    }

    return { data: true };
  } catch (error) {
    return { error: 'Failed to delete timesheet' };
  }
}

export async function getPendingTimesheets(): Promise<ApiArrayResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('timesheets')
      .select(`
        *,
        project:projects(project_name),
        candidate:candidates(first_name, last_name)
      `)
      .eq('approved_by_client', false)
      .order('week_start', { ascending: false });

    if (error) {
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    return { error: 'Failed to fetch pending timesheets' };
  }
}
