import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
import { createActivity } from '@/lib/utils/audit';

export async function getImmigrationRecords(filters?: {
  candidateId?: string;
  visaType?: string;
  expiringWithinDays?: number;
}) {
  let query = supabase
    .from('immigration')
    .select(`
      *,
      candidate:candidates(candidate_id, first_name, last_name, email_address)
    `)
    .order('visa_expiry_date', { ascending: true });

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

  return await query;
}

export async function getImmigrationById(id: string) {
  return await supabase
    .from('immigration')
    .select(`
      *,
      candidate:candidates(candidate_id, first_name, last_name, email_address, phone_number)
    `)
    .eq('immigration_id', id)
    .single();
}

export async function createImmigrationRecord(data: any, userId?: string) {
  const result = await typedInsert('immigration', { ...data, created_by: userId });

  if (result.data && userId) {
    await createActivity({
      entityType: 'immigration',
      entityId: result.data.immigration_id,
      activityType: 'created',
      activityTitle: 'Immigration Record Created',
      activityDescription: `Immigration record for ${data.visa_type} was created`,
      userId,
    });
  }

  return result;
}

export async function updateImmigrationRecord(id: string, updates: any, userId?: string) {
  const result = await typedUpdate('immigration', 'immigration_id', id, { ...updates, updated_by: userId });

  if (result.data && userId) {
    await createActivity({
      entityType: 'immigration',
      entityId: id,
      activityType: 'updated',
      activityTitle: 'Immigration Record Updated',
      activityDescription: 'Immigration record was updated',
      userId,
    });
  }

  return result;
}

export async function getExpiringVisas(days: number = 90) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return await supabase
    .from('immigration')
    .select(`
      *,
      candidate:candidates(first_name, last_name, email_address)
    `)
    .lte('visa_expiry_date', futureDate.toISOString().split('T')[0])
    .gte('visa_expiry_date', new Date().toISOString().split('T')[0])
    .order('visa_expiry_date', { ascending: true });
}
