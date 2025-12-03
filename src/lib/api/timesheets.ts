import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { createActivity } from '@/lib/utils/audit';

export async function getTimesheets(filters?: {
  projectId?: string;
  candidateId?: string;
  approved?: boolean;
  weekStart?: string;
  weekEnd?: string;
}) {
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

  return await query;
}

export async function getTimesheetById(id: string) {
  return await supabase
    .from('timesheets')
    .select(`
      *,
      project:projects(project_id, project_name, bill_rate_final, client:clients(client_name)),
      candidate:candidates(candidate_id, first_name, last_name, email_address)
    `)
    .eq('timesheet_id', id)
    .single();
}

export async function createTimesheet(data: any, userId?: string, teamId?: string) {
  const result = await typedInsert('timesheets', { ...data, created_by: userId, team_id: teamId || null });

  if (result.data && userId) {
    await createActivity({
      entityType: 'timesheets',
      entityId: result.data.timesheet_id,
      activityType: 'created',
      activityTitle: 'Timesheet Created',
      activityDescription: `Timesheet for week ${data.week_start} was created`,
      userId,
    });
  }

  return result;
}

export async function updateTimesheet(id: string, updates: any, userId?: string) {
  const result = await typedUpdate('timesheets', 'timesheet_id', id, { ...updates, updated_by: userId });

  if (result.data && userId) {
    await createActivity({
      entityType: 'timesheets',
      entityId: id,
      activityType: 'updated',
      activityTitle: 'Timesheet Updated',
      activityDescription: 'Timesheet was updated',
      userId,
    });
  }

  return result;
}

export async function deleteTimesheet(id: string, userId?: string) {
  return await supabase
    .from('timesheets')
    .delete()
    .eq('timesheet_id', id);
}

export async function getPendingTimesheets() {
  return await supabase
    .from('timesheets')
    .select(`
      *,
      project:projects(project_name),
      candidate:candidates(first_name, last_name)
    `)
    .eq('approved_by_client', false)
    .order('week_start', { ascending: false });
}
