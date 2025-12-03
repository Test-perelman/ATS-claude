import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { createActivity } from '@/lib/utils/audit';

export async function getInvoices(filters?: {
  projectId?: string;
  clientId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}) {
  let query = supabase
    .from('invoices')
    .select(`
      *,
      project:projects(project_id, project_name, candidate:candidates(first_name, last_name)),
      client:clients(client_id, client_name)
    `)
    .order('invoice_date', { ascending: false });

  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId);
  }

  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.fromDate) {
    query = query.gte('invoice_date', filters.fromDate);
  }

  if (filters?.toDate) {
    query = query.lte('invoice_date', filters.toDate);
  }

  return await query;
}

export async function getInvoiceById(id: string) {
  return await supabase
    .from('invoices')
    .select(`
      *,
      project:projects(project_id, project_name, candidate:candidates(first_name, last_name)),
      client:clients(client_id, client_name, primary_contact_email, payment_terms)
    `)
    .eq('invoice_id', id)
    .single();
}

export async function createInvoice(data: any, userId?: string, teamId?: string) {
  const result = await typedInsert('invoices', { ...data, created_by: userId, team_id: teamId || null });

  if (result.data && userId) {
    await createActivity({
      entityType: 'invoices',
      entityId: result.data.invoice_id,
      activityType: 'created',
      activityTitle: 'Invoice Created',
      activityDescription: `Invoice ${data.invoice_number} was created`,
      userId,
    });
  }

  return result;
}

export async function updateInvoice(id: string, updates: any, userId?: string) {
  const result = await typedUpdate('invoices', 'invoice_id', id, { ...updates, updated_by: userId });

  if (result.data && userId) {
    await createActivity({
      entityType: 'invoices',
      entityId: id,
      activityType: 'updated',
      activityTitle: 'Invoice Updated',
      activityDescription: 'Invoice was updated',
      userId,
    });
  }

  return result;
}

export async function getOverdueInvoices() {
  const today = new Date().toISOString().split('T')[0];

  return await supabase
    .from('invoices')
    .select(`
      *,
      client:clients(client_name)
    `)
    .lt('payment_due_date', today)
    .neq('status', 'Paid')
    .order('payment_due_date', { ascending: true });
}

export async function getInvoiceStats() {
  const { data } = await supabase
    .from('invoices')
    .select('invoice_amount, status');

  if (!data) return { total: 0, paid: 0, pending: 0, overdue: 0 };

  const total = data.reduce((sum, inv: any) => sum + (parseFloat(inv.invoice_amount) || 0), 0);
  const paid = data
    .filter((inv: any) => inv.status === 'Paid')
    .reduce((sum, inv: any) => sum + (parseFloat(inv.invoice_amount) || 0), 0);
  const pending = data
    .filter((inv: any) => inv.status === 'Sent')
    .reduce((sum, inv: any) => sum + (parseFloat(inv.invoice_amount) || 0), 0);
  const overdue = data
    .filter((inv: any) => inv.status === 'Overdue')
    .reduce((sum, inv: any) => sum + (parseFloat(inv.invoice_amount) || 0), 0);

  return { total, paid, pending, overdue };
}
