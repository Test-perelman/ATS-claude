/**
 * Vendor API Functions
 *
 * Multi-Tenant Architecture:
 * - All create/update/delete operations require authenticated userId
 * - team_id is ALWAYS extracted server-side from user context
 * - NEVER trust team_id from client requests
 * - Master admins can optionally specify target team via filters
 */

import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { findDuplicateVendors, mergeEntityData } from '@/lib/utils/deduplication';
import { createAuditLog, createActivity } from '@/lib/utils/audit';
import { getTeamContext, applyTeamFilter, validateTeamAccess } from '@/lib/utils/team-context';
import type { Database } from '@/types/database';
import type { ApiResponse, ApiVoidResponse } from '@/types/api';

type Vendor = Database['public']['Tables']['vendors']['Row'];
type VendorInsert = Database['public']['Tables']['vendors']['Insert'];
type VendorUpdate = Database['public']['Tables']['vendors']['Update'];

type CreateVendorResponse =
  | { data: Vendor; error?: never; duplicate: false }
  | { data?: never; error: string; duplicate?: false }
  | { data?: never; error?: never; duplicate: true; matches: any[]; matchType?: string };

/**
 * Get all vendors with filters
 *
 * @param userId - Authenticated user ID (REQUIRED for team scoping)
 * @param filters - Optional filters (search, status, pagination)
 * @param filters.teamId - For master admin: specify which team to view (null = all teams)
 */
export async function getVendors(
    userId: string,
    filters?: {
        search?: string;
        tierLevel?: string;
        isActive?: boolean;
        limit?: number;
        offset?: number;
        teamId?: string; // Only used by master admin to filter specific team
    }
): Promise<ApiResponse<{ vendors: Vendor[]; count: number | null }>> {
    try {
        // Apply team filtering based on user's context
        const teamFilters = await applyTeamFilter(userId, filters);

        let query = supabase
            .from('vendors')
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
                `vendor_name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%`
            );
        }

        if (filters?.tierLevel) {
            query = query.eq('tier_level', filters.tierLevel);
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

        return { data: { vendors: data || [], count } };
    } catch (error: any) {
        return { error: error.message || 'Failed to fetch vendors' };
    }
}

/**
 * Get vendor by ID
 */
export async function getVendorById(vendorId: string): Promise<ApiResponse<any>> {
    try {
        const { data, error } = await supabase
            .from('vendors')
            .select(`
          *,
          created_by_user:created_by(username),
          updated_by_user:updated_by(username)
        `)
            .eq('vendor_id', vendorId)
            .single();

        if (error) {
            return { error: error.message };
        }

        return { data };
    } catch (error: any) {
        return { error: error.message || 'Failed to fetch vendor' };
    }
}

/**
 * Create a new vendor with deduplication
 *
 * @param vendorData - Vendor data (WITHOUT team_id - it will be set server-side)
 * @param userId - Authenticated user ID (REQUIRED)
 * @param options - Optional configuration
 *
 * Security:
 * - team_id is ALWAYS extracted from authenticated user
 * - Client cannot manipulate team_id
 * - RLS policies enforce team isolation at database level
 */
export async function createVendor(
    vendorData: Omit<VendorInsert, 'team_id' | 'created_by' | 'updated_by'>,
    userId: string,
    options?: { skipDuplicateCheck?: boolean }
): Promise<CreateVendorResponse> {
    try {
        // Extract team context from authenticated user (SERVER-SIDE)
        const teamContext = await getTeamContext(userId);

        if (!teamContext.teamId) {
            return { error: 'Cannot create vendor: User team not found. Please contact your administrator.' };
        }

        // Check for duplicates unless explicitly skipped
        if (!options?.skipDuplicateCheck) {
            const duplicateCheck = await findDuplicateVendors({
                vendor_name: vendorData.vendor_name,
                contact_email: (vendorData as any).contact_email || (vendorData as any).email || undefined,
                contact_phone: (vendorData as any).contact_phone || (vendorData as any).phone || undefined,
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

        // Create new vendor with server-controlled team_id
        const { data, error } = await typedInsert('vendors', {
            ...vendorData,
            team_id: teamContext.teamId, // SERVER-CONTROLLED - never from client
            created_by: userId,
            updated_by: userId,
        } as any);

        if (error) {
            return { error: error.message };
        }

        if (!data) {
            return { error: 'Failed to create vendor' };
        }

        // Create audit log
        await createAuditLog({
            entityName: 'vendors',
            entityId: data.vendor_id,
            action: 'CREATE',
            newValue: data,
            userId,
            teamId: data.team_id || undefined,
        });

        // Create activity
        await createActivity({
            entityType: 'vendor',
            entityId: data.vendor_id,
            activityType: 'created',
            activityTitle: 'Vendor Created',
            activityDescription: `${data.vendor_name} was added to the system`,
            userId,
            teamId: data.team_id || undefined,
        });

        return { data, duplicate: false };
    } catch (error: any) {
        return { error: error.message || 'Failed to create vendor' };
    }
}

/**
 * Update an existing vendor
 *
 * @param vendorId - The vendor ID to update
 * @param updates - Fields to update (team_id cannot be changed)
 * @param userId - Authenticated user ID (REQUIRED)
 *
 * Security:
 * - Validates user has access to the vendor's team
 * - Master admin can update any team's vendors
 * - Regular users can only update their own team's vendors
 */
export async function updateVendor(
    vendorId: string,
    updates: Omit<VendorUpdate, 'team_id' | 'updated_by'>,
    userId: string
): Promise<ApiResponse<Vendor>> {
    try {
        // Get current data for audit log and team validation
        const oldDataResult = await getVendorById(vendorId);
        if ('error' in oldDataResult) {
            return oldDataResult;
        }
        const oldData = oldDataResult.data;

        if (!oldData) {
            return { error: 'Vendor not found' };
        }

        // Validate user has access to this vendor's team
        await validateTeamAccess(userId, oldData.team_id);

        // Update vendor (team_id cannot be changed)
        const { data, error } = await typedUpdate('vendors', 'vendor_id', vendorId, {
            ...updates,
            updated_by: userId,
        } as any);

        if (error) {
            return { error: error.message };
        }

        if (!data) {
            return { error: 'Failed to update vendor' };
        }

        // Create audit log
        await createAuditLog({
            entityName: 'vendors',
            entityId: vendorId,
            action: 'UPDATE',
            oldValue: oldData,
            newValue: data,
            userId,
            teamId: data.team_id || undefined,
        });

        // Create activity for significant changes
        const oldVendor = oldData as any;
        if ((updates as any).tier_level && (updates as any).tier_level !== oldVendor?.tier_level) {
            await createActivity({
                entityType: 'vendor',
                entityId: vendorId,
                activityType: 'status_change',
                activityTitle: 'Vendor Tier Updated',
                activityDescription: `Tier changed from ${oldVendor?.tier_level} to ${(updates as any).tier_level}`,
                userId,
                teamId: data.team_id || undefined,
            });
        }

        return { data };
    } catch (error: any) {
        return { error: error.message || 'Failed to update vendor' };
    }
}

/**
 * Merge vendor data with existing record
 *
 * @param existingVendorId - The existing vendor ID
 * @param newData - New data to merge
 * @param userId - Authenticated user ID (REQUIRED)
 */
export async function mergeVendor(
    existingVendorId: string,
    newData: Partial<Omit<VendorInsert, 'team_id'>>,
    userId: string
): Promise<ApiResponse<Vendor>> {
    try {
        // Get existing vendor
        const result = await getVendorById(existingVendorId);

        if ('error' in result && result.error) {
            return { error: result.error };
        }

        if (!('data' in result) || !result.data) {
            return { error: 'Failed to retrieve vendor' };
        }

        // Validate user has access to this vendor's team
        await validateTeamAccess(userId, result.data.team_id);

        // Merge data
        const merged = mergeEntityData(result.data, newData);

        // Update with merged data
        return updateVendor(existingVendorId, merged, userId);
    } catch (error: any) {
        return { error: error.message || 'Failed to merge vendor' };
    }
}

/**
 * Delete a vendor
 *
 * @param vendorId - The vendor ID to delete
 * @param userId - Authenticated user ID (REQUIRED)
 *
 * Security:
 * - Validates user has access to the vendor's team
 * - Master admin can delete any team's vendors
 * - Regular users can only delete their own team's vendors
 */
export async function deleteVendor(vendorId: string, userId: string): Promise<ApiVoidResponse> {
    try {
        // Get data for audit log and team validation
        const result = await getVendorById(vendorId);
        if ('error' in result) {
            return result;
        }
        const vendorData = result.data;

        if (!vendorData) {
            return { error: 'Vendor not found' };
        }

        // Validate user has access to this vendor's team
        await validateTeamAccess(userId, vendorData.team_id);

        const { error } = await supabase
            .from('vendors')
            .delete()
            .eq('vendor_id', vendorId);

        if (error) {
            return { error: error.message };
        }

        // Create audit log
        await createAuditLog({
            entityName: 'vendors',
            entityId: vendorId,
            action: 'DELETE',
            oldValue: vendorData,
            userId,
            teamId: vendorData.team_id || undefined,
        });

        return { data: true };
    } catch (error: any) {
        return { error: error.message || 'Failed to delete vendor' };
    }
}
