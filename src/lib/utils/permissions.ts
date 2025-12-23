/**
 * Permission Checking Utilities V2
 * Role-based access control (RBAC) with multi-tenant support
 *
 * Key Features:
 * - Master admins bypass all permission checks
 * - Local admins have full permissions within their team
 * - Regular users have role-based permissions
 */

import { createServerClient } from '@/lib/supabase/server'
import type { Database, PermissionModule } from '@/types/database'

/**
 * Check if user has a specific permission
 * Master admins automatically have all permissions
 *
 * @param userId - The user's ID
 * @param permissionKey - The permission key to check (e.g., 'candidates.create')
 * @returns True if user has the permission
 */
export async function checkPermission(
  userId: string,
  permissionKey: string
): Promise<boolean> {
  const supabase = await createServerClient()

  // Get user with role information
  // Note: users table uses id; roles table uses id/is_admin
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id,
      role_id,
      is_master_admin,
      role:roles (
        id,
        is_admin
      )
    `)
    .eq('id', userId)
    .single()

  if (error || !user) {
    return false
  }

  // Master admin has all permissions
  if ((user as any).is_master_admin) {
    return true
  }

  // Local admin has all permissions within their team
  // Note: roles table uses is_admin, not is_admin_role
  if ((user as any).role?.is_admin === true) {
    return true
  }

  // Check role permissions
  if (!(user as any).role_id) {
    return false
  }

  const { data: rolePermissions } = await supabase
    .from('role_permissions')
    .select(`
      permission:permissions (
        key
      )
    `)
    .eq('role_id', (user as any).role_id)

  if (!rolePermissions) {
    return false
  }

  const permissions = (rolePermissions as any)
    .map((rp: any) => (rp.permission as any)?.key)
    .filter(Boolean)

  return permissions.includes(permissionKey)
}

/**
 * Get all permissions for a user
 *
 * @param userId - The user's ID
 * @returns Array of permission keys
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const supabase = await createServerClient()

  // Get user with role information
  // Note: users table uses id; roles table uses id/is_admin
  const { data: user } = await supabase
    .from('users')
    .select(`
      id,
      role_id,
      is_master_admin,
      role:roles (
        id,
        is_admin
      )
    `)
    .eq('id', userId)
    .single()

  if (!user) {
    return []
  }

  // Master admins and local admins have all permissions
  // Note: roles table uses is_admin; permissions table uses key
  if ((user as any).is_master_admin || (user as any).role?.is_admin === true) {
    // Return all permission keys
    const { data: allPermissions } = await supabase
      .from('permissions')
      .select('key')

    return (allPermissions as any)?.map((p: any) => p.key) || []
  }

  // Get role-specific permissions
  if (!(user as any).role_id) {
    return []
  }

  // Note: permissions table uses key, not permission_key
  const { data: rolePermissions } = await supabase
    .from('role_permissions')
    .select(`
      permission:permissions (
        key
      )
    `)
    .eq('role_id', (user as any).role_id)

  return (rolePermissions as any)
    ?.map((rp: any) => (rp.permission as any)?.key)
    .filter(Boolean) || []
}

/**
 * Check if user has any of the specified permissions
 *
 * @param userId - The user's ID
 * @param permissionKeys - Array of permission keys to check
 * @returns True if user has at least one of the permissions
 */
export async function checkAnyPermission(
  userId: string,
  permissionKeys: string[]
): Promise<boolean> {
  const supabase = await createServerClient()

  // Get user info
  // Note: users table uses id; roles table uses is_admin
  const { data: user } = await supabase
    .from('users')
    .select('id, is_master_admin, role:roles(is_admin)')
    .eq('id', userId)
    .single()

  if (!user) {
    return false
  }

  // Master admin and local admin have all permissions
  if ((user as any).is_master_admin || (user as any).role?.is_admin === true) {
    return true
  }

  // Check each permission
  for (const key of permissionKeys) {
    if (await checkPermission(userId, key)) {
      return true
    }
  }

  return false
}

/**
 * Check if user has all specified permissions
 *
 * @param userId - The user's ID
 * @param permissionKeys - Array of permission keys to check
 * @returns True if user has all the permissions
 */
export async function checkAllPermissions(
  userId: string,
  permissionKeys: string[]
): Promise<boolean> {
  const supabase = await createServerClient()

  // Get user info
  // Note: users table uses id; roles table uses is_admin
  const { data: user } = await supabase
    .from('users')
    .select('id, is_master_admin, role:roles(is_admin)')
    .eq('id', userId)
    .single()

  if (!user) {
    return false
  }

  // Master admin and local admin have all permissions
  if ((user as any).is_master_admin || (user as any).role?.is_admin === true) {
    return true
  }

  // Check each permission
  for (const key of permissionKeys) {
    if (!(await checkPermission(userId, key))) {
      return false
    }
  }

  return true
}

/**
 * Check if user is a local admin (team administrator)
 *
 * @param userId - The user's ID
 * @returns True if user is a local admin
 */
export async function isLocalAdmin(userId: string): Promise<boolean> {
  const supabase = await createServerClient()

  // Note: users table uses id; roles table uses is_admin
  const { data: user } = await supabase
    .from('users')
    .select(`
      id,
      is_master_admin,
      role:roles (
        is_admin
      )
    `)
    .eq('id', userId)
    .single()

  if (!user) {
    return false
  }

  // Master admins are not local admins (they're global)
  if ((user as any).is_master_admin) {
    return false
  }

  return (user as any).role?.is_admin === true
}

/**
 * Check if user is a master admin (system administrator)
 *
 * @param userId - The user's ID
 * @returns True if user is a master admin
 */
export async function isMasterAdmin(userId: string): Promise<boolean> {
  const supabase = await createServerClient()

  // Note: users table uses id, not user_id
  const { data: user } = await supabase
    .from('users')
    .select('id, is_master_admin')
    .eq('id', userId)
    .single()

  return (user as any)?.is_master_admin === true
}

/**
 * Get all permissions grouped by module
 *
 * @returns Object with modules as keys and permission arrays as values
 */
export async function getAllPermissionsGrouped(): Promise<Record<string, PermissionModule['permissions']>> {
  const supabase = await createServerClient()

  // Note: permissions table uses key, not permission_key
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('module, key')

  if (error || !data) {
    return {}
  }

  const grouped: Record<string, PermissionModule['permissions']> = {}

  // Note: permissions table uses id/key/name, not permission_id/permission_key/permission_name
  data.forEach((permission: any) => {
    const module = permission.module || 'other'
    if (!grouped[module]) {
      grouped[module] = []
    }
    grouped[module].push({
      permission_id: permission.id,
      permission_key: permission.key,
      permission_name: permission.name,
      description: null, // no description column in schema
    })
  })

  return grouped
}

/**
 * Get role permissions for a specific role
 *
 * @param roleId - The role ID
 * @returns Array of permission keys
 */
export async function getRolePermissions(roleId: string): Promise<string[]> {
  const supabase = await createServerClient()

  // Note: permissions table uses key, not permission_key
  const { data } = await supabase
    .from('role_permissions')
    .select(`
      permission:permissions (
        key
      )
    `)
    .eq('role_id', roleId)

  return (data as any)
    ?.map((rp: any) => (rp.permission as any)?.key)
    .filter(Boolean) || []
}

/**
 * Assign permission to role
 *
 * @param roleId - The role ID
 * @param permissionId - The permission ID
 * @param grantedBy - User ID who granted the permission
 */
export async function assignPermissionToRole(
  roleId: string,
  permissionId: string,
  grantedBy?: string
) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('role_permissions')
    .upsert({
      role_id: roleId,
      permission_id: permissionId,
      granted_by: grantedBy || null,
    } as any, {
      onConflict: 'role_id,permission_id'
    })

  return { data, error }
}

/**
 * Revoke permission from role
 *
 * @param roleId - The role ID
 * @param permissionId - The permission ID
 */
export async function revokePermissionFromRole(roleId: string, permissionId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)
    .eq('permission_id', permissionId)

  return { data, error }
}

/**
 * Bulk update permissions for a role
 * Replaces all existing permissions with the new set
 *
 * @param roleId - The role ID
 * @param permissionIds - Array of permission IDs to assign
 * @param grantedBy - User ID who granted the permissions
 */
export async function updateRolePermissions(
  roleId: string,
  permissionIds: string[],
  grantedBy?: string
) {
  const supabase = await createServerClient()

  // Delete existing permissions
  await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)

  // Insert new permissions
  if (permissionIds.length > 0) {
    const { data, error } = await supabase
      .from('role_permissions')
      .insert(
        permissionIds.map(permissionId => ({
          role_id: roleId,
          permission_id: permissionId,
          granted_by: grantedBy || null,
        })) as any
      )

    return { data, error }
  }

  return { data: null, error: null }
}

/**
 * Permission constants for easy reference
 * Based on the module.action pattern from seed data
 */
export const PERMISSIONS = {
  // Candidates
  CANDIDATES_CREATE: 'candidates.create',
  CANDIDATES_READ: 'candidates.read',
  CANDIDATES_UPDATE: 'candidates.update',
  CANDIDATES_DELETE: 'candidates.delete',
  CANDIDATES_EXPORT: 'candidates.export',

  // Vendors
  VENDORS_CREATE: 'vendors.create',
  VENDORS_READ: 'vendors.read',
  VENDORS_UPDATE: 'vendors.update',
  VENDORS_DELETE: 'vendors.delete',
  VENDORS_EXPORT: 'vendors.export',

  // Clients
  CLIENTS_CREATE: 'clients.create',
  CLIENTS_READ: 'clients.read',
  CLIENTS_UPDATE: 'clients.update',
  CLIENTS_DELETE: 'clients.delete',
  CLIENTS_EXPORT: 'clients.export',

  // Requirements
  REQUIREMENTS_CREATE: 'requirements.create',
  REQUIREMENTS_READ: 'requirements.read',
  REQUIREMENTS_UPDATE: 'requirements.update',
  REQUIREMENTS_DELETE: 'requirements.delete',
  REQUIREMENTS_EXPORT: 'requirements.export',

  // Submissions
  SUBMISSIONS_CREATE: 'submissions.create',
  SUBMISSIONS_READ: 'submissions.read',
  SUBMISSIONS_UPDATE: 'submissions.update',
  SUBMISSIONS_DELETE: 'submissions.delete',
  SUBMISSIONS_EXPORT: 'submissions.export',

  // Interviews
  INTERVIEWS_CREATE: 'interviews.create',
  INTERVIEWS_READ: 'interviews.read',
  INTERVIEWS_UPDATE: 'interviews.update',
  INTERVIEWS_DELETE: 'interviews.delete',
  INTERVIEWS_EXPORT: 'interviews.export',

  // Projects
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_READ: 'projects.read',
  PROJECTS_UPDATE: 'projects.update',
  PROJECTS_DELETE: 'projects.delete',
  PROJECTS_EXPORT: 'projects.export',

  // Timesheets
  TIMESHEETS_CREATE: 'timesheets.create',
  TIMESHEETS_READ: 'timesheets.read',
  TIMESHEETS_UPDATE: 'timesheets.update',
  TIMESHEETS_DELETE: 'timesheets.delete',
  TIMESHEETS_APPROVE: 'timesheets.approve',
  TIMESHEETS_EXPORT: 'timesheets.export',

  // Invoices
  INVOICES_CREATE: 'invoices.create',
  INVOICES_READ: 'invoices.read',
  INVOICES_UPDATE: 'invoices.update',
  INVOICES_DELETE: 'invoices.delete',
  INVOICES_SEND: 'invoices.send',
  INVOICES_EXPORT: 'invoices.export',

  // Immigration
  IMMIGRATION_CREATE: 'immigration.create',
  IMMIGRATION_READ: 'immigration.read',
  IMMIGRATION_UPDATE: 'immigration.update',
  IMMIGRATION_DELETE: 'immigration.delete',
  IMMIGRATION_EXPORT: 'immigration.export',

  // Users
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_MANAGE_ROLES: 'users.manage-roles',

  // Roles
  ROLES_CREATE: 'roles.create',
  ROLES_READ: 'roles.read',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',

  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_CREATE: 'reports.create',
  REPORTS_EXPORT: 'reports.export',

  // Settings
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',

  // Notes
  NOTES_CREATE: 'notes.create',
  NOTES_READ: 'notes.read',
  NOTES_UPDATE: 'notes.update',
  NOTES_DELETE: 'notes.delete',

  // Activities
  ACTIVITIES_READ: 'activities.read',
} as const
