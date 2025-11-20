/**
 * Permission Checking Utilities
 * Role-based access control (RBAC)
 */

import { supabase } from '@/lib/supabase/client';

export interface Permission {
  permission_id: string;
  permission_key: string;
  permission_description: string | null;
  module_name: string | null;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
  allowed: boolean;
}

/**
 * Get all permissions for a role
 */
export async function getRolePermissions(roleId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permission:permissions(permission_key)')
    .eq('role_id', roleId)
    .eq('allowed', true);

  if (error || !data) {
    console.error('Error fetching role permissions:', error);
    return [];
  }

  return data.map((rp: any) => rp.permission.permission_key);
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(userId: string, permissionKey: string): Promise<boolean> {
  // Get user's role
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role_id')
    .eq('user_id', userId)
    .single();

  if (userError || !user || !user.role_id) {
    return false;
  }

  // Get role permissions
  const permissions = await getRolePermissions(user.role_id);

  return permissions.includes(permissionKey);
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  permissionKeys: string[]
): Promise<boolean> {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role_id')
    .eq('user_id', userId)
    .single();

  if (userError || !user || !user.role_id) {
    return false;
  }

  const permissions = await getRolePermissions(user.role_id);

  return permissionKeys.some((key) => permissions.includes(key));
}

/**
 * Check if user has all specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  permissionKeys: string[]
): Promise<boolean> {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role_id')
    .eq('user_id', userId)
    .single();

  if (userError || !user || !user.role_id) {
    return false;
  }

  const permissions = await getRolePermissions(user.role_id);

  return permissionKeys.every((key) => permissions.includes(key));
}

/**
 * Get user's role name
 */
export async function getUserRole(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('role:roles(role_name)')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return (data as any).role?.role_name || null;
}

/**
 * Check if user is Super Admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'Super Admin';
}

/**
 * Assign permission to role
 */
export async function assignPermissionToRole(roleId: string, permissionId: string) {
  const { data, error } = await supabase.from('role_permissions').upsert(
    {
      role_id: roleId,
      permission_id: permissionId,
      allowed: true,
    },
    { onConflict: 'role_id,permission_id' }
  );

  return { data, error };
}

/**
 * Revoke permission from role
 */
export async function revokePermissionFromRole(roleId: string, permissionId: string) {
  const { data, error } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)
    .eq('permission_id', permissionId);

  return { data, error };
}

/**
 * Get all permissions grouped by module
 */
export async function getAllPermissionsGrouped() {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('module_name, permission_key');

  if (error || !data) {
    return {};
  }

  const grouped: Record<string, Permission[]> = {};

  data.forEach((permission) => {
    const module = permission.module_name || 'Other';
    if (!grouped[module]) {
      grouped[module] = [];
    }
    grouped[module].push(permission);
  });

  return grouped;
}

/**
 * Permission constants for easy reference
 */
export const PERMISSIONS = {
  // Candidates
  CANDIDATE_CREATE: 'candidate.create',
  CANDIDATE_READ: 'candidate.read',
  CANDIDATE_UPDATE: 'candidate.update',
  CANDIDATE_DELETE: 'candidate.delete',

  // Vendors
  VENDOR_CREATE: 'vendor.create',
  VENDOR_READ: 'vendor.read',
  VENDOR_UPDATE: 'vendor.update',
  VENDOR_DELETE: 'vendor.delete',

  // Clients
  CLIENT_CREATE: 'client.create',
  CLIENT_READ: 'client.read',
  CLIENT_UPDATE: 'client.update',
  CLIENT_DELETE: 'client.delete',

  // Jobs
  JOB_CREATE: 'job.create',
  JOB_READ: 'job.read',
  JOB_UPDATE: 'job.update',
  JOB_DELETE: 'job.delete',

  // Submissions
  SUBMISSION_CREATE: 'submission.create',
  SUBMISSION_READ: 'submission.read',
  SUBMISSION_UPDATE: 'submission.update',
  SUBMISSION_DELETE: 'submission.delete',

  // Interviews
  INTERVIEW_CREATE: 'interview.create',
  INTERVIEW_READ: 'interview.read',
  INTERVIEW_UPDATE: 'interview.update',
  INTERVIEW_DELETE: 'interview.delete',

  // Projects
  PROJECT_CREATE: 'project.create',
  PROJECT_READ: 'project.read',
  PROJECT_UPDATE: 'project.update',
  PROJECT_DELETE: 'project.delete',

  // Timesheets
  TIMESHEET_CREATE: 'timesheet.create',
  TIMESHEET_READ: 'timesheet.read',
  TIMESHEET_UPDATE: 'timesheet.update',
  TIMESHEET_APPROVE: 'timesheet.approve',

  // Invoices
  INVOICE_CREATE: 'invoice.create',
  INVOICE_READ: 'invoice.read',
  INVOICE_UPDATE: 'invoice.update',
  INVOICE_DELETE: 'invoice.delete',

  // Immigration
  IMMIGRATION_CREATE: 'immigration.create',
  IMMIGRATION_READ: 'immigration.read',
  IMMIGRATION_UPDATE: 'immigration.update',

  // Users
  USER_CREATE: 'user.create',
  USER_READ: 'user.read',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',

  // Settings
  SETTINGS_MANAGE: 'settings.manage',
  AUDIT_VIEW: 'audit.view',
  REPORTS_VIEW: 'reports.view',
} as const;
