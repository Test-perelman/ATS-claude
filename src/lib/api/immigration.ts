import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { createActivity } from '@/lib/utils/audit';
import type { Database } from '@/types/database';
import type { ApiResponse, ApiArrayResponse, ApiVoidResponse } from '@/types/api';

type Immigration = Database['public']['Tables']['immigration']['Row'];
type ImmigrationInsert = Database['public']['Tables']['immigration']['Insert'];
type ImmigrationUpdate = Database['public']['Tables']['immigration']['Update'];

/**
 * Get all immigration records with optional filters
 * @param filters.teamId - Filter by team (for master admin)
 * @param filters.userTeamId - Current user's team ID (for non-master admin filtering)
 * @param filters.isMasterAdmin - Whether current user is master admin
 */
export async function getImmigrationRecords(filters?: {
  candidateId?: string;
  visaType?: string;
  expiringWithinDays?: number;
  teamId?: string;
  userTeamId?: string;
  isMasterAdmin?: boolean;
}): Promise<ApiArrayResponse<any>> {
  try {
    let query = supabase
      .from('immigration')
      .select(`
        *,
        candidate:candidates(candidate_id, first_name, last_name, email_address),
        team:team_id(team_id, team_name, company_name)
      `)
      .order('visa_expiry_date', { ascending: true });

    // Team filtering logic
    if (filters?.isMasterAdmin) {
      if (filters?.teamId) {
        query = query.eq('team_id', filters.teamId);
      }
    } else if (filters?.userTeamId) {
      query = query.eq('team_id', filters.userTeamId);
    }

    if (filters?.candidateId) {
      query = query.eq('candidate_id', filters.candidateId);
    }

    if (filters?.visaType) {
      query = query.eq('visa_type', filters.visaType);
    }

    if (filters?.expiringWithinDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + filters.expiringWithinDays);
      query = query.lte('visa_expiry_date', futureDate.toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (error) {
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    return { error: 'Failed to fetch immigration records' };
  }
}

export async function getImmigrationById(id: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('immigration')
      .select(`
        *,
        candidate:candidates(candidate_id, first_name, last_name, email_address, phone_number)
      `)
      .eq('immigration_id', id)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    return { error: 'Failed to fetch immigration record' };
  }
}

export async function createImmigrationRecord(data: ImmigrationInsert, userId?: string, teamId?: string): Promise<ApiResponse<Immigration>> {
  try {
    const result = await typedInsert('immigration', { ...data, created_by: userId, team_id: teamId || null } as any);

    if (result.error) {
      return { error: result.error.message };
    }

    if (!result.data) {
      return { error: 'Failed to create immigration record' };
    }

    if (userId) {
      await createActivity({
        entityType: 'immigration',
        entityId: (result.data as any).immigration_id || (result.data as any).case_id,
        activityType: 'created',
        activityTitle: 'Immigration Record Created',
        activityDescription: `Immigration record for ${data.visa_type} was created`,
        userId,
      });
    }

    return { data: result.data };
  } catch (error) {
    return { error: 'Failed to create immigration record' };
  }
}

export async function updateImmigrationRecord(id: string, updates: ImmigrationUpdate, userId?: string): Promise<ApiResponse<Immigration>> {
  try {
    const result = await typedUpdate('immigration', 'case_id' as any, id, { ...updates, updated_by: userId } as any);

    if (result.error) {
      return { error: result.error.message };
    }

    if (!result.data) {
      return { error: 'Failed to update immigration record' };
    }

    if (userId) {
      await createActivity({
        entityType: 'immigration',
        entityId: id,
        activityType: 'updated',
        activityTitle: 'Immigration Record Updated',
        activityDescription: 'Immigration record was updated',
        userId,
      });
    }

    return { data: result.data };
  } catch (error) {
    return { error: 'Failed to update immigration record' };
  }
}

export async function getExpiringVisas(days: number = 90): Promise<ApiArrayResponse<any>> {
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const { data, error } = await supabase
      .from('immigration')
      .select(`
        *,
        candidate:candidates(first_name, last_name, email_address)
      `)
      .lte('visa_expiry_date', futureDate.toISOString().split('T')[0])
      .gte('visa_expiry_date', new Date().toISOString().split('T')[0])
      .order('visa_expiry_date', { ascending: true });

    if (error) {
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    return { error: 'Failed to fetch expiring visas' };
  }
}
