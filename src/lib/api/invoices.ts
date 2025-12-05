import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { createActivity } from '@/lib/utils/audit';
import type { ApiResponse, ApiArrayResponse, ApiVoidResponse } from '@/types/api';
import type { Database } from '@/types/database';

type Invoice = Database['public']['Tables']['invoices']['Row'];

type InvoiceStats = {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
};

export async function getInvoices(filters?: {
  projectId?: string;
  clientId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<ApiArrayResponse<Invoice>> {
  try {
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

    const { data, error } = await query;

    if (error) {
      return { error: error.message };
    }

    return { data: data as Invoice[] };
  } catch (err) {
    return { error: 'Failed to fetch invoices' };
  }
}

export async function getInvoiceById(id: string): Promise<ApiResponse<Invoice>> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        project:projects(project_id, project_name, candidate:candidates(first_name, last_name)),
        client:clients(client_id, client_name, primary_contact_email, payment_terms)
      `)
      .eq('invoice_id', id)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as Invoice };
  } catch (err) {
    return { error: 'Failed to fetch invoice' };
  }
}

export async function createInvoice(
  data: any,
  userId?: string,
  teamId?: string
): Promise<ApiResponse<Invoice>> {
  try {
    const { data: result, error } = await typedInsert('invoices', {
      ...data,
      created_by: userId,
      team_id: teamId || null,
    });

    if (error) {
      return { error: error.message };
    }

    if (result && userId) {
      await createActivity({
        entityType: 'invoices',
        entityId: result.invoice_id,
        activityType: 'created',
        activityTitle: 'Invoice Created',
        activityDescription: `Invoice ${data.invoice_number} was created`,
        userId,
      });
    }

    return { data: result as Invoice };
  } catch (err) {
    return { error: 'Failed to create invoice' };
  }
}

export async function updateInvoice(
  id: string,
  updates: any,
  userId?: string
): Promise<ApiResponse<Invoice>> {
  try {
    const { data: result, error } = await typedUpdate('invoices', 'invoice_id', id, {
      ...updates,
      updated_by: userId,
    });

    if (error) {
      return { error: error.message };
    }

    if (result && userId) {
      await createActivity({
        entityType: 'invoices',
        entityId: id,
        activityType: 'updated',
        activityTitle: 'Invoice Updated',
        activityDescription: 'Invoice was updated',
        userId,
      });
    }

    return { data: result as Invoice };
  } catch (err) {
    return { error: 'Failed to update invoice' };
  }
}

export async function getOverdueInvoices(): Promise<ApiArrayResponse<Invoice>> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(client_name)
      `)
      .lt('payment_due_date', today)
      .neq('status', 'Paid')
      .order('payment_due_date', { ascending: true });

    if (error) {
      return { error: error.message };
    }

    return { data: data as Invoice[] };
  } catch (err) {
    return { error: 'Failed to fetch overdue invoices' };
  }
}

export async function getInvoiceStats(): Promise<ApiResponse<InvoiceStats>> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_amount, status');

    if (error) {
      return { error: error.message };
    }

    if (!data) {
      return {
        data: { total: 0, paid: 0, pending: 0, overdue: 0 },
      };
    }

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

    return {
      data: { total, paid, pending, overdue },
    };
  } catch (err) {
    return { error: 'Failed to fetch invoice statistics' };
  }
}
