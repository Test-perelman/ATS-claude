/**
 * Client API Functions
 */

import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { findDuplicateClients, mergeEntityData } from '@/lib/utils/deduplication';
import { createAuditLog, createActivity } from '@/lib/utils/audit';
import type { Database } from '@/types/database';
import type { ApiResponse, ApiVoidResponse } from '@/types/api';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type ClientUpdate = Database['public']['Tables']['clients']['Update'];

type CreateClientResponse =
  | { data: Client; error?: never; duplicate: false }
  | { data?: never; error: string; duplicate?: false }
  | { data?: never; error?: never; duplicate: true; matches: any[]; matchType?: string };

/**
 * Get all clients with filters
 */
export async function getClients(filters?: {
    search?: string;
    industry?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
}): Promise<ApiResponse<{ clients: Client[]; count: number | null }>> {
    try {
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

        if (error) {
            return { error: error.message };
        }

        return { data: { clients: data || [], count } };
    } catch (error) {
        return { error: 'Failed to fetch clients' };
    }
}

/**
 * Get client by ID
 */
export async function getClientById(clientId: string): Promise<ApiResponse<any>> {
    try {
        const { data, error } = await supabase
            .from('clients')
            .select(`
          *,
          created_by_user:created_by(username),
          updated_by_user:updated_by(username)
        `)
            .eq('client_id', clientId)
            .single();

        if (error) {
            return { error: error.message };
        }

        return { data };
    } catch (error) {
        return { error: 'Failed to fetch client' };
    }
}

/**
 * Create a new client with deduplication
 */
export async function createClient(
    clientData: ClientInsert,
    userId?: string,
    teamId?: string,
    options?: { skipDuplicateCheck?: boolean }
): Promise<CreateClientResponse> {
    try {
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
                    duplicate: true,
                    matches: duplicateCheck.matches,
                    matchType: duplicateCheck.matchType,
                };
            }
        }

        // Create new client
        const { data, error } = await typedInsert('clients', {
            ...clientData,
            created_by: userId || null,
            updated_by: userId || null,
            team_id: teamId || null,
        });

        if (error) {
            return { error: error.message };
        }

        if (!data) {
            return { error: 'Failed to create client' };
        }

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

        return { data, duplicate: false };
    } catch (error) {
        return { error: 'Failed to create client' };
    }
}

/**
 * Update an existing client
 */
export async function updateClient(
    clientId: string,
    updates: ClientUpdate,
    userId?: string
): Promise<ApiResponse<Client>> {
    try {
        // Get current data for audit log
        const oldDataResult = await getClientById(clientId);
        const oldData = 'data' in oldDataResult ? oldDataResult.data : null;

        // Update client
        const { data, error } = await typedUpdate('clients', 'client_id', clientId, {
            ...updates,
            updated_by: userId || null,
        });

        if (error) {
            return { error: error.message };
        }

        if (!data) {
            return { error: 'Failed to update client' };
        }

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
        const oldClient = oldData as Client | null;
        if (updates.is_active !== undefined && updates.is_active !== oldClient?.is_active) {
            await createActivity({
                entityType: 'client',
                entityId: clientId,
                activityType: 'status_change',
                activityTitle: 'Client Status Updated',
                activityDescription: `Status changed to ${updates.is_active ? 'Active' : 'Inactive'}`,
                userId,
            });
        }

        return { data };
    } catch (error) {
        return { error: 'Failed to update client' };
    }
}

/**
 * Merge client data with existing record
 */
export async function mergeClient(
    existingClientId: string,
    newData: Partial<ClientInsert>,
    userId?: string
): Promise<ApiResponse<Client>> {
    try {
        // Get existing client
        const result = await getClientById(existingClientId);

        if ('error' in result && result.error) {
            return { error: result.error };
        }

        if (!('data' in result) || !result.data) {
            return { error: 'Failed to retrieve client' };
        }

        // Merge data
        const merged = mergeEntityData(result.data, newData);

        // Update with merged data
        return updateClient(existingClientId, merged, userId);
    } catch (error) {
        return { error: 'Failed to merge client' };
    }
}

/**
 * Delete a client
 */
export async function deleteClient(clientId: string, userId?: string): Promise<ApiVoidResponse> {
    try {
        // Get data for audit log
        const result = await getClientById(clientId);
        const clientData = 'data' in result ? result.data : null;

        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('client_id', clientId);

        if (error) {
            return { error: error.message };
        }

        if (clientData) {
            // Create audit log
            await createAuditLog({
                entityName: 'clients',
                entityId: clientId,
                action: 'DELETE',
                oldValue: clientData,
                userId,
            });
        }

        return { data: true };
    } catch (error) {
        return { error: 'Failed to delete client' };
    }
}
