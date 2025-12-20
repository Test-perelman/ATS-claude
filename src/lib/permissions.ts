import { createClient } from '@/lib/supabase/server';

// ============================================================================
// PERMISSION KEYS (User-facing constants)
// ============================================================================

export const PERMISSIONS = {
  // Users
  create_user: 'create_user',
  view_users: 'view_users',
  edit_user: 'edit_user',
  delete_user: 'delete_user',

  // Roles & Permissions
  manage_roles: 'manage_roles',
  assign_roles: 'assign_roles',

  // Candidates
  create_candidate: 'create_candidate',
  view_candidates: 'view_candidates',
  edit_candidate: 'edit_candidate',
  delete_candidate: 'delete_candidate',

  // Vendors
  create_vendor: 'create_vendor',
  view_vendors: 'view_vendors',
  edit_vendor: 'edit_vendor',
  delete_vendor: 'delete_vendor',

  // Clients
  create_client: 'create_client',
  view_clients: 'view_clients',
  edit_client: 'edit_client',
  delete_client: 'delete_client',

  // Jobs
  create_job: 'create_job',
  view_jobs: 'view_jobs',
  edit_job: 'edit_job',
  delete_job: 'delete_job',

  // Submissions
  create_submission: 'create_submission',
  view_submissions: 'view_submissions',
  edit_submission: 'edit_submission',
  delete_submission: 'delete_submission',

  // Interviews
  create_interview: 'create_interview',
  view_interviews: 'view_interviews',
  edit_interview: 'edit_interview',
  delete_interview: 'delete_interview',

  // Projects
  create_project: 'create_project',
  view_projects: 'view_projects',
  edit_project: 'edit_project',
  delete_project: 'delete_project',

  // Timesheets
  create_timesheet: 'create_timesheet',
  view_timesheets: 'view_timesheets',
  edit_timesheet: 'edit_timesheet',
  approve_timesheet: 'approve_timesheet',

  // Invoices
  create_invoice: 'create_invoice',
  view_invoices: 'view_invoices',
  edit_invoice: 'edit_invoice',
  delete_invoice: 'delete_invoice',

  // Immigration
  view_immigration: 'view_immigration',
  edit_immigration: 'edit_immigration',
};

// ============================================================================
// Check if user has permission (Server-side)
// ============================================================================

export async function hasPermission(
  userId: string,
  permissionKey: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await (supabase.rpc as any)('user_has_permission', {
    user_id: userId,
    permission_key: permissionKey,
  });

  return data === true;
}

// ============================================================================
// Get all user permissions
// ============================================================================

export async function getUserPermissions(userId: string): Promise<string[]> {
  const supabase = await createClient();

  const userResult = await supabase
    .from('users')
    .select('is_master_admin, role_id')
    .eq('user_id', userId)
    .single() as any;
  const user = userResult?.data as { is_master_admin: boolean; role_id: string } | null;

  if (!user) return [];

  // Master admin has all permissions
  if (user.is_master_admin) {
    return Object.values(PERMISSIONS);
  }

  // Get role permissions
  const permResult = await supabase
    .from('role_permissions')
    .select('permission_id, permissions(key)')
    .eq('role_id', user.role_id) as any;
  const permissions = permResult?.data as any[];

  return permissions?.map((p) => p.permissions?.key).filter(Boolean) as string[];
}

// ============================================================================
// Check multiple permissions (any match)
// ============================================================================

export async function hasAnyPermission(
  userId: string,
  permissionKeys: string[]
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  return permissionKeys.some((key) => userPermissions.includes(key));
}

// ============================================================================
// Check multiple permissions (all required)
// ============================================================================

export async function hasAllPermissions(
  userId: string,
  permissionKeys: string[]
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  return permissionKeys.every((key) => userPermissions.includes(key));
}

// ============================================================================
// Get role permissions
// ============================================================================

export async function getRolePermissions(roleId: string): Promise<string[]> {
  const supabase = await createClient();

  const result = await supabase
    .from('role_permissions')
    .select('permissions(key)')
    .eq('role_id', roleId) as any;
  const data = result?.data as any[];

  return data?.map((p) => p.permissions?.key).filter(Boolean) as string[];
}

// ============================================================================
// Assign permissions to role
// ============================================================================

export async function assignPermissionsToRole(
  roleId: string,
  permissionKeys: string[]
): Promise<void> {
  const supabase = await createClient();

  // Get permission IDs
  const permResult = await supabase
    .from('permissions')
    .select('id, key')
    .in('key', permissionKeys) as any;
  const permissions = permResult?.data as any[];

  if (!permissions) throw new Error('Permissions not found');

  // Delete existing
  await supabase.from('role_permissions').delete().eq('role_id', roleId);

  // Insert new
  const inserts = permissions.map((p: any) => ({
    role_id: roleId,
    permission_id: p.id,
  }));

  const insertResult = await (supabase
    .from('role_permissions') as any)
    .insert(inserts) as any;

  if (insertResult.error) throw insertResult.error;
}
