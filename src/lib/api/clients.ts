/**
 * Client API Functions
 */

import { supabase } from '@/lib/supabase/client';
import { findDuplicateClients, mergeEntityData } from '@/lib/utils/deduplication';
import { createAuditLog, createActivity } from '@/lib/utils/audit';
import type { Database } from '@/types/database';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type ClientUpdate = Database['public']['Tables']['clients']['Update'];

/**
 * Get all clients with filters
 */
export async function getClients(filters?: {
    search?: string;
    industry?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
}) {
    let query = supabase
        .from('clients')
        .select('*', { count: 'exact' });

    if (filters?.search) {
        query = query.or(
            `client_name.ilike.%${filters.search}%,primary_contact_name.ilike.%${filters.search}%,primary_contact_email.ilike.%${filters.search}%`
        );
    }

    if (filters?.industry) {
        query = query.eq('industry', filters.industry);
    }

    if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
    }

    if (filters?.limit) {
        query = query.limit(filters.limit);
    }

    if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    return { data, error, count };
}

/**
 * Get client by ID
 */
export async function getClientById(clientId: string) {
    const { data, error } = await supabase
        .from('clients')
        .select(`
      *,
      created_by_user:created_by(username),
      updated_by_user:updated_by(username)
    `)
        .eq('client_id', clientId)
        .single();

    return { data, error };
}

/**
 * Create a new client with deduplication
 */
export async function createClient(
    clientData: ClientInsert,
    userId?: string,
    options?: { skipDuplicateCheck?: boolean }
) {
    // Check for duplicates unless explicitly skipped
    if (!options?.skipDuplicateCheck) {
        const duplicateCheck = await findDuplicateClients({
            client_name: clientData.client_name,
            primary_contact_email: clientData.primary_contact_email || undefined,
            primary_contact_phone: clientData.primary_contact_phone || undefined,
        });

        if (duplicateCheck.found && duplicateCheck.matches.length > 0) {
            // Return duplicate info for user decision
            return {
                data: null,
                error: null,
                duplicate: true,
                matches: duplicateCheck.matches,
                matchType: duplicateCheck.matchType,
            };
        }
    }

    // Create new client
    const { data, error } = await supabase
        .from('clients')
        .insert({
            ...clientData,
            created_by: userId || null,
            updated_by: userId || null,
        })
        .select()
        .single();

    if (data && !error) {
        // Create audit log
        await createAuditLog({
            entityName: 'clients',
            entityId: data.client_id,
            action: 'CREATE',
            newValue: data,
            userId,
        });

        // Create activity
        await createActivity({
            entityType: 'client',
            entityId: data.client_id,
            activityType: 'created',
            activityTitle: 'Client Created',
            activityDescription: `${data.client_name} was added to the system`,
            userId,
        });
    }

    return { data, error, duplicate: false };
}

/**
 * Update an existing client
 */
export async function updateClient(
    clientId: string,
    updates: ClientUpdate,
    userId?: string
) {
    // Get current data for audit log
    const { data: oldData } = await getClientById(clientId);

    // Update client
    const { data, error } = await supabase
        .from('clients')
        .update({
            ...updates,
            updated_by: userId || null,
        })
        .eq('client_id', clientId)
        .select()
        .single();

    if (data && !error) {
        // Create audit log
        await createAuditLog({
            entityName: 'clients',
            entityId: clientId,
            action: 'UPDATE',
            oldValue: oldData,
            newValue: data,
            userId,
        });

        // Create activity for significant changes
        if (updates.is_active !== undefined && updates.is_active !== oldData?.is_active) {
            await createActivity({
                entityType: 'client',
                entityId: clientId,
                activityType: 'status_change',
                activityTitle: 'Client Status Updated',
                activityDescription: `Status changed to ${updates.is_active ? 'Active' : 'Inactive'}`,
                userId,
            });
        }
    }

    return { data, error };
}

/**
 * Merge client data with existing record
 */
export async function mergeClient(
    existingClientId: string,
    newData: Partial<ClientInsert>,
    userId?: string
) {
    // Get existing client
    const { data: existing } = await getClientById(existingClientId);

    if (!existing) {
        return { data: null, error: { message: 'Client not found' } };
    }

    // Merge data
    const merged = mergeEntityData(existing, newData);

    // Update with merged data
    return updateClient(existingClientId, merged, userId);
}

/**
 * Delete a client
 */
export async function deleteClient(clientId: string, userId?: string) {
    // Get data for audit log
    const { data: clientData } = await getClientById(clientId);

    const { data, error } = await supabase
        .from('clients')
        .delete()
        .eq('client_id', clientId);

    if (!error && clientData) {
        // Create audit log
        await createAuditLog({
            entityName: 'clients',
            entityId: clientId,
            action: 'DELETE',
            oldValue: clientData,
            userId,
        });
    }

    return { data, error };
}
