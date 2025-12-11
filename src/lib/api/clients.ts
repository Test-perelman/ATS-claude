/**
 * Client API Functions
 *
 * Multi-Tenant Architecture:
 * - All create/update/delete operations require authenticated userId
 * - team_id is ALWAYS extracted server-side from user context
 * - NEVER trust team_id from client requests
 * - Master admins can optionally specify target team via filters
 */

import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { findDuplicateClients, mergeEntityData } from '@/lib/utils/deduplication';
import { createAuditLog, createActivity } from '@/lib/utils/audit';
import { getTeamContext, applyTeamFilter, validateTeamAccess } from '@/lib/utils/team-context';
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
 *
 * @param userId - Authenticated user ID (REQUIRED for team scoping)
 * @param filters - Optional filters (search, status, pagination)
 * @param filters.teamId - For master admin: specify which team to view (null = all teams)
 */
export async function getClients(
    userId: string,
    filters?: {
        search?: string;
        industry?: string;
        isActive?: boolean;
        limit?: number;
        offset?: number;
        teamId?: string; // Only used by master admin to filter specific team
    }
): Promise<ApiResponse<{ clients: Client[]; count: number | null }>> {
    try {
        // Apply team filtering based on user's context
        const teamFilters = await applyTeamFilter(userId, filters);

        let query = supabase
            .from('clients')
            .select(`
                *,
                team:team_id(team_id, team_name, company_name)
            `, { count: 'exact' });

        // Apply team filter
        if (teamFilters.teamId) {
            query = query.eq('team_id', teamFilters.teamId);
        }
        // If teamFilters.teamId is null, master admin sees all teams

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
 *
 * @param clientData - Client data (WITHOUT team_id - it will be set server-side)
 * @param userId - Authenticated user ID (REQUIRED)
 * @param options - Optional configuration
 *
 * Security:
 * - team_id is ALWAYS extracted from authenticated user
 * - Client cannot manipulate team_id
 * - RLS policies enforce team isolation at database level
 */
export async function createClient(
    clientData: Omit<ClientInsert, 'team_id' | 'created_by' | 'updated_by'>,
    userId: string,
    options?: { skipDuplicateCheck?: boolean }
): Promise<CreateClientResponse> {
    try {
        // Extract team context from authenticated user (SERVER-SIDE)
        const teamContext = await getTeamContext(userId);

        if (!teamContext.teamId) {
            return { error: 'Cannot create client: User team not found. Please contact your administrator.' };
        }

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

        // Create new client with server-controlled team_id
        const { data, error } = await typedInsert('clients', {
            ...clientData,
            team_id: teamContext.teamId, // SERVER-CONTROLLED - never from client
            created_by: userId,
            updated_by: userId,
        } as any);

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
            teamId: data.team_id || undefined,
        });

        // Create activity
        await createActivity({
            entityType: 'client',
            entityId: data.client_id,
            activityType: 'created',
            activityTitle: 'Client Created',
            activityDescription: `${data.client_name} was added to the system`,
            userId,
            teamId: data.team_id || undefined,
        });

        return { data, duplicate: false };
    } catch (error: any) {
        return { error: error.message || 'Failed to create client' };
    }
}

/**
 * Update an existing client
 *
 * @param clientId - The client ID to update
 * @param updates - Fields to update (team_id cannot be changed)
 * @param userId - Authenticated user ID (REQUIRED)
 *
 * Security:
 * - Validates user has access to the client's team
 * - Master admin can update any team's clients
 * - Regular users can only update their own team's clients
 */
export async function updateClient(
    clientId: string,
    updates: Omit<ClientUpdate, 'team_id' | 'updated_by'>,
    userId: string
): Promise<ApiResponse<Client>> {
    try {
        // Get current data for audit log and team validation
        const oldDataResult = await getClientById(clientId);
        if ('error' in oldDataResult) {
            return oldDataResult;
        }
        const oldData = oldDataResult.data;

        if (!oldData) {
            return { error: 'Client not found' };
        }

        // Validate user has access to this client's team
        await validateTeamAccess(userId, oldData.team_id);

        // Update client (team_id cannot be changed)
        const { data, error } = await typedUpdate('clients', 'client_id', clientId, {
            ...updates,
            updated_by: userId,
        } as any);

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
        const oldClient = oldData as any;
        if ((updates as any).is_active !== undefined && (updates as any).is_active !== oldClient?.is_active) {
            await createActivity({
                entityType: 'client',
                entityId: clientId,
                activityType: 'status_change',
                activityTitle: 'Client Status Updated',
                activityDescription: `Status changed to ${(updates as any).is_active ? 'Active' : 'Inactive'}`,
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
 *
 * @param existingClientId - The existing client ID
 * @param newData - New data to merge
 * @param userId - Authenticated user ID (REQUIRED)
 */
export async function mergeClient(
    existingClientId: string,
    newData: Partial<Omit<ClientInsert, 'team_id'>>,
    userId: string
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

        // Validate user has access to this client's team
        await validateTeamAccess(userId, result.data.team_id);

        // Merge data
        const merged = mergeEntityData(result.data, newData);

        // Update with merged data
        return updateClient(existingClientId, merged, userId);
    } catch (error: any) {
        return { error: error.message || 'Failed to merge client' };
    }
}

/**
 * Delete a client
 *
 * @param clientId - The client ID to delete
 * @param userId - Authenticated user ID (REQUIRED)
 *
 * Security:
 * - Validates user has access to the client's team
 * - Master admin can delete any team's clients
 * - Regular users can only delete their own team's clients
 */
export async function deleteClient(clientId: string, userId: string): Promise<ApiVoidResponse> {
    try {
        // Get data for audit log and team validation
        const result = await getClientById(clientId);
        if ('error' in result) {
            return result;
        }
        const clientData = result.data;

        if (!clientData) {
            return { error: 'Client not found' };
        }

        // Validate user has access to this client's team
        await validateTeamAccess(userId, clientData.team_id);

        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('client_id', clientId);

        if (error) {
            return { error: error.message };
        }

        // Create audit log
        await createAuditLog({
            entityName: 'clients',
            entityId: clientId,
            action: 'DELETE',
            oldValue: clientData,
            userId,
            teamId: clientData.team_id || undefined,
        });

        return { data: true };
    } catch (error: any) {
        return { error: error.message || 'Failed to delete client' };
    }
}
