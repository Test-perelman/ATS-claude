/**
 * Audit Log Utility
 * Automatically tracks all changes to entities
 */

import { supabase, typedInsert } from '@/lib/supabase/client';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW';

interface AuditLogParams {
  entityName: string;
  entityId: string;
  action: AuditAction;
  oldValue?: any;
  newValue?: any;
  userId?: string;
  teamId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog({
  entityName,
  entityId,
  action,
  oldValue,
  newValue,
  userId,
  teamId,
  ipAddress,
  userAgent,
}: AuditLogParams) {
  // Find changed fields
  const changedFields: string[] = [];

  if (oldValue && newValue) {
    Object.keys(newValue).forEach((key) => {
      if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
        changedFields.push(key);
      }
    });
  }

  const { data, error } = await typedInsert('audit_log', {
    entity_name: entityName,
    entity_id: entityId,
    action,
    old_value_json: oldValue || null,
    new_value_json: newValue || null,
    changed_fields: changedFields.length > 0 ? changedFields : null,
    performed_by_user_id: userId || null,
    team_id: teamId || null,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
  });

  if (error) {
    console.error('Failed to create audit log:', error);
  }

  return { data, error };
}



/**
 * Get audit logs for an entity
 */
export async function getAuditLogs(entityName: string, entityId: string) {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*, performed_by_user:users(username, email)')
    .eq('entity_name', entityName)
    .eq('entity_id', entityId)
    .order('performed_at', { ascending: false });

  return { data, error };
}

/**
 * Get recent audit logs for a user
 */
export async function getUserAuditLogs(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('performed_by_user_id', userId)
    .order('performed_at', { ascending: false })
    .limit(limit);

  return { data, error };
}

/**
 * Get all audit logs with filters
 */
export async function getFilteredAuditLogs(filters: {
  entityName?: string;
  action?: AuditAction;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  let query = supabase
    .from('audit_log')
    .select('*, performed_by_user:users(username, email)')
    .order('performed_at', { ascending: false });

  if (filters.entityName) {
    query = query.eq('entity_name', filters.entityName);
  }

  if (filters.action) {
    query = query.eq('action', filters.action);
  }

  if (filters.userId) {
    query = query.eq('performed_by_user_id', filters.userId);
  }

  if (filters.startDate) {
    query = query.gte('performed_at', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('performed_at', filters.endDate);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  return { data, error };
}

/**
 * Create an activity entry (for timeline)
 */
export async function createActivity({
  entityType,
  entityId,
  activityType,
  activityTitle,
  activityDescription,
  metadata,
  userId,
  teamId,
}: {
  entityType: string;
  entityId: string;
  activityType: string;
  activityTitle: string;
  activityDescription?: string;
  metadata?: any;
  userId?: string;
  teamId?: string;
}) {
  const { data, error } = await typedInsert('activities', {
    entity_type: entityType,
    entity_id: entityId,
    activity_type: activityType,
    activity_title: activityTitle,
    activity_description: activityDescription || null,
    metadata: metadata || null,
    created_by: userId || null,
    team_id: teamId || null,
  });

  return { data, error };
}

/**
 * Get activities for timeline
 */
export async function getActivities(entityType: string, entityId: string) {
  const { data, error } = await supabase
    .from('activities')
    .select('*, created_by_user:users(username, email)')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  return { data, error };
}
