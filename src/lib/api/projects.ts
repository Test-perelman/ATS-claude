import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { createActivity } from '@/lib/utils/audit';

export async function getProjects(filters?: {
  search?: string;
  status?: string;
  candidateId?: string;
  clientId?: string;
}) {
  let query = supabase
    .from('projects')
    .select(`
      *,
      candidate:candidates(candidate_id, first_name, last_name, email_address),
      client:clients(client_id, client_name),
      vendor:vendors(vendor_id, vendor_name)
    `)
    .order('start_date', { ascending: false });

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

  return await query;
}

export async function getProjectById(id: string) {
  return await supabase
    .from('projects')
    .select(`
      *,
      candidate:candidates(candidate_id, first_name, last_name, email_address, phone_number),
      client:clients(client_id, client_name, primary_contact_name, primary_contact_email),
      vendor:vendors(vendor_id, vendor_name, contact_name, contact_email)
    `)
    .eq('project_id', id)
    .single();
}

export async function createProject(data: any, userId?: string, teamId?: string) {
  const result = await typedInsert('projects', { ...data, created_by: userId, team_id: teamId || null });

  if (result.data && userId) {
    await createActivity({
      entityType: 'projects',
      entityId: result.data.project_id,
      activityType: 'created',
      activityTitle: 'Project Created',
      activityDescription: `Project ${data.project_name} was created`,
      userId,
    });
  }

  return result;
}

export async function updateProject(id: string, updates: any, userId?: string) {
  const result = await typedUpdate('projects', 'project_id', id, { ...updates, updated_by: userId });

  if (result.data && userId) {
    await createActivity({
      entityType: 'projects',
      entityId: id,
      activityType: 'updated',
      activityTitle: 'Project Updated',
      activityDescription: 'Project information was updated',
      userId,
    });
  }

  return result;
}

export async function deleteProject(id: string, userId?: string) {
  const result = await supabase
    .from('projects')
    .delete()
    .eq('project_id', id);

  if (!result.error && userId) {
    await createActivity({
      entityType: 'projects',
      entityId: id,
      activityType: 'deleted',
      activityTitle: 'Project Deleted',
      activityDescription: 'Project was deleted',
      userId,
    });
  }

  return result;
}

export async function getActiveProjects() {
  return await supabase
    .from('projects')
    .select(`
      *,
      candidate:candidates(first_name, last_name),
      client:clients(client_name)
    `)
    .eq('status', 'Active')
    .order('start_date', { ascending: false });
}

export async function getProjectRevenue() {
  const { data } = await supabase
    .from('projects')
    .select('bill_rate_final, pay_rate_final, margin')
    .eq('status', 'Active');

  if (!data) return { totalRevenue: 0, totalCost: 0, totalMargin: 0 };

  const totalRevenue = data.reduce((sum, p: any) => sum + (parseFloat(p.bill_rate_final) || 0), 0);
  const totalCost = data.reduce((sum, p: any) => sum + (parseFloat(p.pay_rate_final) || 0), 0);
  const totalMargin = data.reduce((sum, p: any) => sum + (parseFloat(p.margin) || 0), 0);

  return { totalRevenue, totalCost, totalMargin };
}
