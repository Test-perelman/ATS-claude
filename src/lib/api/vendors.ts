/**
 * Vendor API Functions
 */

import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { findDuplicateVendors, mergeEntityData } from '@/lib/utils/deduplication';
import { createAuditLog, createActivity } from '@/lib/utils/audit';
import type { Database } from '@/types/database';
import type { ApiResponse, ApiVoidResponse } from '@/types/api';

type Vendor = Database['public']['Tables']['vendors']['Row'];
type VendorInsert = Database['public']['Tables']['vendors']['Insert'];
type VendorUpdate = Database['public']['Tables']['vendors']['Update'];

/**
 * Get all vendors with filters
 */
export async function getVendors(filters?: {
    search?: string;
    tierLevel?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
}): Promise<ApiResponse<{ vendors: Vendor[]; count: number | null }>> {
    try {
        let query = supabase
            .from('vendors')
            .select('*', { count: 'exact' });

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
    } catch (error) {
        return { error: 'Failed to fetch vendors' };
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
    } catch (error) {
        return { error: 'Failed to fetch vendor' };
    }
}

/**
 * Create a new vendor with deduplication
 */
export async function createVendor(
    vendorData: VendorInsert,
    userId?: string,
    teamId?: string,
    options?: { skipDuplicateCheck?: boolean }
): Promise<ApiResponse<Vendor> | { data?: never; error?: never; duplicate: true; matches: any[]; matchType?: string }> {
    try {
        // Check for duplicates unless explicitly skipped
        if (!options?.skipDuplicateCheck) {
            const duplicateCheck = await findDuplicateVendors({
                vendor_name: vendorData.vendor_name,
                contact_email: vendorData.contact_email || undefined,
                contact_phone: vendorData.contact_phone || undefined,
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

        // Create new vendor
        const { data, error } = await typedInsert('vendors', {
            ...vendorData,
            created_by: userId || null,
            updated_by: userId || null,
            team_id: teamId || null,
        });

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
        });

        // Create activity
        await createActivity({
            entityType: 'vendor',
            entityId: data.vendor_id,
            activityType: 'created',
            activityTitle: 'Vendor Created',
            activityDescription: `${data.vendor_name} was added to the system`,
            userId,
        });

        return { data };
    } catch (error) {
        return { error: 'Failed to create vendor' };
    }
}

/**
 * Update an existing vendor
 */
export async function updateVendor(
    vendorId: string,
    updates: VendorUpdate,
    userId?: string
): Promise<ApiResponse<Vendor>> {
    try {
        // Get current data for audit log
        const oldDataResult = await getVendorById(vendorId);
        const oldData = 'data' in oldDataResult ? oldDataResult.data : null;

        // Update vendor
        const { data, error } = await typedUpdate('vendors', 'vendor_id', vendorId, {
            ...updates,
            updated_by: userId || null,
        });

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
        });

        // Create activity for significant changes
        const oldVendor = oldData as Vendor | null;
        if (updates.tier_level && updates.tier_level !== oldVendor?.tier_level) {
            await createActivity({
                entityType: 'vendor',
                entityId: vendorId,
                activityType: 'status_change',
                activityTitle: 'Vendor Tier Updated',
                activityDescription: `Tier changed from ${oldVendor?.tier_level} to ${updates.tier_level}`,
                userId,
            });
        }

        return { data };
    } catch (error) {
        return { error: 'Failed to update vendor' };
    }
}

/**
 * Merge vendor data with existing record
 */
export async function mergeVendor(
    existingVendorId: string,
    newData: Partial<VendorInsert>,
    userId?: string
): Promise<ApiResponse<Vendor>> {
    try {
        // Get existing vendor
        const result = await getVendorById(existingVendorId);

        if ('error' in result) {
            return { error: result.error };
        }

        // Merge data
        const merged = mergeEntityData(result.data, newData);

        // Update with merged data
        return updateVendor(existingVendorId, merged, userId);
    } catch (error) {
        return { error: 'Failed to merge vendor' };
    }
}

/**
 * Delete a vendor
 */
export async function deleteVendor(vendorId: string, userId?: string): Promise<ApiVoidResponse> {
    try {
        // Get data for audit log
        const result = await getVendorById(vendorId);
        const vendorData = 'data' in result ? result.data : null;

        const { error } = await supabase
            .from('vendors')
            .delete()
            .eq('vendor_id', vendorId);

        if (error) {
            return { error: error.message };
        }

        if (vendorData) {
            // Create audit log
            await createAuditLog({
                entityName: 'vendors',
                entityId: vendorId,
                action: 'DELETE',
                oldValue: vendorData,
                userId,
            });
        }

        return { data: true };
    } catch (error) {
        return { error: 'Failed to delete vendor' };
    }
}
