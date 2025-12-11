/**
 * Role Management Helper Functions V2
 * Utilities for managing roles, permissions, and role templates
 * Includes both server-side role management and client-side helper functions
 */

import { createServerClient } from '@/lib/supabase/server'
import type { Database, RoleWithPermissions, UserWithRole } from '@/types/database'

// ================================================================
// SERVER-SIDE ROLE MANAGEMENT
// ================================================================

/**
 * Get all roles for a team with their permissions
 *
 * @param teamId - The team ID
 * @returns Array of roles with permissions
 */
export async function getTeamRoles(teamId: string): Promise<RoleWithPermissions[]> {
  const supabase = await createServerClient()

  const { data: roles, error } = await supabase
    .from('roles')
    .select(`
      role_id,
      team_id,
      role_name,
      description,
      is_admin_role,
      is_custom,
      based_on_template,
      role_permissions (
        permission:permissions (
          permission_id,
          permission_key,
          permission_name,
          module
        )
      )
    `)
    .eq('team_id', teamId)
    .order('role_name')

  if (error || !roles) {
    return []
  }

  return roles.map(role => ({
    role_id: role.role_id,
    team_id: role.team_id,
    role_name: role.role_name,
    description: role.description,
    is_admin_role: role.is_admin_role,
    is_custom: role.is_custom,
    based_on_template: role.based_on_template,
    permissions: (role.role_permissions as any[])
      .map(rp => rp.permission)
      .filter(Boolean),
  }))
}

/**
 * Get a specific role with its permissions
 *
 * @param roleId - The role ID
 * @returns Role with permissions or null
 */
export async function getRoleWithPermissions(roleId: string): Promise<RoleWithPermissions | null> {
  const supabase = await createServerClient()

  const { data: role, error } = await supabase
    .from('roles')
    .select(`
      role_id,
      team_id,
      role_name,
      description,
      is_admin_role,
      is_custom,
      based_on_template,
      role_permissions (
        permission:permissions (
          permission_id,
          permission_key,
          permission_name,
          module
        )
      )
    `)
    .eq('role_id', roleId)
    .single()

  if (error || !role) {
    return null
  }

  return {
    role_id: role.role_id,
    team_id: role.team_id,
    role_name: role.role_name,
    description: role.description,
    is_admin_role: role.is_admin_role,
    is_custom: role.is_custom,
    based_on_template: role.based_on_template,
    permissions: (role.role_permissions as any[])
      .map(rp => rp.permission)
      .filter(Boolean),
  }
}

/**
 * Clone role templates for a new team
 * This is called during team signup to create team-specific roles
 *
 * @param teamId - The team ID to clone roles for
 * @returns Array of created role IDs
 */
export async function cloneRoleTemplatesForTeam(teamId: string): Promise<string[]> {
  const supabase = await createServerClient()

  // Get all role templates
  const { data: templates } = await supabase
    .from('role_templates')
    .select('*')
    .eq('is_system_template', true)

  if (!templates || templates.length === 0) {
    throw new Error('No role templates found')
  }

  const createdRoleIds: string[] = []

  // Clone each template
  for (const template of templates) {
    // Create team-specific role
    const { data: newRole, error: roleError } = await supabase
      .from('roles')
      .insert({
        team_id: teamId,
        role_name: template.template_name,
        description: template.description,
        is_admin_role: template.is_admin_role,
        is_custom: false,
        based_on_template: template.template_id,
      })
      .select('role_id')
      .single()

    if (roleError || !newRole) {
      console.error('Error creating role:', roleError)
      continue
    }

    createdRoleIds.push(newRole.role_id)

    // Get template permissions
    const { data: templatePermissions } = await supabase
      .from('template_permissions')
      .select('permission_id')
      .eq('template_id', template.template_id)

    if (templatePermissions && templatePermissions.length > 0) {
      // Clone permissions for the new role
      await supabase
        .from('role_permissions')
        .insert(
          templatePermissions.map(tp => ({
            role_id: newRole.role_id,
            permission_id: tp.permission_id,
          }))
        )
    }
  }

  return createdRoleIds
}

/**
 * Create a custom role for a team
 *
 * @param teamId - The team ID
 * @param roleName - Name of the new role
 * @param description - Optional description
 * @param permissionIds - Array of permission IDs to assign
 * @param createdBy - User ID who created the role
 * @returns The created role or null if error
 */
export async function createCustomRole(
  teamId: string,
  roleName: string,
  description: string | null,
  permissionIds: string[],
  createdBy?: string
): Promise<Database['public']['Tables']['roles']['Row'] | null> {
  const supabase = await createServerClient()

  // Create the role
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .insert({
      team_id: teamId,
      role_name: roleName,
      description,
      is_admin_role: false,
      is_custom: true,
      based_on_template: null,
    })
    .select()
    .single()

  if (roleError || !role) {
    console.error('Error creating custom role:', roleError)
    return null
  }

  // Assign permissions
  if (permissionIds.length > 0) {
    await supabase
      .from('role_permissions')
      .insert(
        permissionIds.map(permissionId => ({
          role_id: role.role_id,
          permission_id: permissionId,
          granted_by: createdBy || null,
        }))
      )
  }

  return role
}

/**
 * Clone an existing role within the same team
 *
 * @param sourceRoleId - The role ID to clone from
 * @param newRoleName - Name for the cloned role
 * @param teamId - The team ID (for validation)
 * @param createdBy - User ID who cloned the role
 * @returns The cloned role or null if error
 */
export async function cloneRole(
  sourceRoleId: string,
  newRoleName: string,
  teamId: string,
  createdBy?: string
): Promise<Database['public']['Tables']['roles']['Row'] | null> {
  const supabase = await createServerClient()

  // Get source role
  const { data: sourceRole } = await supabase
    .from('roles')
    .select('*')
    .eq('role_id', sourceRoleId)
    .eq('team_id', teamId)
    .single()

  if (!sourceRole) {
    return null
  }

  // Get source role permissions
  const { data: sourcePermissions } = await supabase
    .from('role_permissions')
    .select('permission_id')
    .eq('role_id', sourceRoleId)

  // Create new role
  const { data: newRole, error } = await supabase
    .from('roles')
    .insert({
      team_id: teamId,
      role_name: newRoleName,
      description: `Cloned from ${sourceRole.role_name}`,
      is_admin_role: false, // Cloned roles are never admin roles
      is_custom: true,
      based_on_template: sourceRole.based_on_template,
    })
    .select()
    .single()

  if (error || !newRole) {
    console.error('Error cloning role:', error)
    return null
  }

  // Clone permissions
  if (sourcePermissions && sourcePermissions.length > 0) {
    await supabase
      .from('role_permissions')
      .insert(
        sourcePermissions.map(sp => ({
          role_id: newRole.role_id,
          permission_id: sp.permission_id,
          granted_by: createdBy || null,
        }))
      )
  }

  return newRole
}

/**
 * Update role permissions
 *
 * @param roleId - The role ID
 * @param permissionIds - Array of permission IDs to assign (replaces all existing)
 * @param updatedBy - User ID who updated the permissions
 */
export async function updateRolePermissions(
  roleId: string,
  permissionIds: string[],
  updatedBy?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient()

  // Verify role exists and is not an admin role
  const { data: role } = await supabase
    .from('roles')
    .select('role_id, is_admin_role')
    .eq('role_id', roleId)
    .single()

  if (!role) {
    return { success: false, error: 'Role not found' }
  }

  // Admin roles cannot have their permissions modified
  if (role.is_admin_role) {
    return { success: false, error: 'Cannot modify admin role permissions' }
  }

  // Delete existing permissions
  const { error: deleteError } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  // Insert new permissions
  if (permissionIds.length > 0) {
    const { error: insertError } = await supabase
      .from('role_permissions')
      .insert(
        permissionIds.map(permissionId => ({
          role_id: roleId,
          permission_id: permissionId,
          granted_by: updatedBy || null,
        }))
      )

    if (insertError) {
      return { success: false, error: insertError.message }
    }
  }

  return { success: true }
}

/**
 * Delete a custom role
 * Cannot delete system roles (based on templates) or admin roles
 *
 * @param roleId - The role ID to delete
 * @param teamId - The team ID (for validation)
 * @returns Success status
 */
export async function deleteCustomRole(
  roleId: string,
  teamId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient()

  // Get role to verify it's deletable
  const { data: role } = await supabase
    .from('roles')
    .select('role_id, team_id, is_custom, is_admin_role, based_on_template')
    .eq('role_id', roleId)
    .eq('team_id', teamId)
    .single()

  if (!role) {
    return { success: false, error: 'Role not found' }
  }

  // Cannot delete admin roles
  if (role.is_admin_role) {
    return { success: false, error: 'Cannot delete admin roles' }
  }

  // Cannot delete system roles (those based on templates)
  if (!role.is_custom) {
    return { success: false, error: 'Cannot delete system roles' }
  }

  // Check if any users are assigned to this role
  const { data: usersWithRole, error: usersError } = await supabase
    .from('users')
    .select('user_id')
    .eq('role_id', roleId)
    .limit(1)

  if (usersError) {
    return { success: false, error: usersError.message }
  }

  if (usersWithRole && usersWithRole.length > 0) {
    return { success: false, error: 'Cannot delete role: users are still assigned to it' }
  }

  // Delete the role (permissions will cascade delete)
  const { error: deleteError } = await supabase
    .from('roles')
    .delete()
    .eq('role_id', roleId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  return { success: true }
}

/**
 * Get the Local Admin role for a team
 *
 * @param teamId - The team ID
 * @returns The Local Admin role or null
 */
export async function getLocalAdminRole(teamId: string) {
  const supabase = await createServerClient()

  const { data: role } = await supabase
    .from('roles')
    .select('*')
    .eq('team_id', teamId)
    .eq('is_admin_role', true)
    .single()

  return role
}

/**
 * Check if a role name is available within a team
 *
 * @param teamId - The team ID
 * @param roleName - The role name to check
 * @param excludeRoleId - Optional role ID to exclude from the check (for updates)
 * @returns True if the name is available
 */
export async function isRoleNameAvailable(
  teamId: string,
  roleName: string,
  excludeRoleId?: string
): Promise<boolean> {
  const supabase = await createServerClient()

  let query = supabase
    .from('roles')
    .select('role_id')
    .eq('team_id', teamId)
    .eq('role_name', roleName)

  if (excludeRoleId) {
    query = query.neq('role_id', excludeRoleId)
  }

  const { data } = await query.limit(1)

  return !data || data.length === 0
}

/**
 * Get all role templates (for master admin or during team setup)
 *
 * @returns Array of role templates
 */
export async function getAllRoleTemplates() {
  const supabase = await createServerClient()

  const { data: templates } = await supabase
    .from('role_templates')
    .select(`
      *,
      template_permissions (
        permission:permissions (
          permission_id,
          permission_key,
          permission_name,
          module
        )
      )
    `)
    .eq('is_system_template', true)
    .order('template_name')

  return templates || []
}

// ================================================================
// CLIENT-SIDE HELPER FUNCTIONS
// ================================================================

/**
 * Check if user is Master Admin
 */
export function isMasterAdmin(user: UserWithRole | null): boolean {
  if (!user) return false
  return user.is_master_admin === true
}

/**
 * Check if user is Local Admin
 */
export function isLocalAdmin(user: UserWithRole | null): boolean {
  if (!user || !user.role) return false
  return user.role.is_admin_role === true
}

/**
 * Check if user is any type of admin (Master or Local)
 */
export function isAdmin(user: UserWithRole | null): boolean {
  return isMasterAdmin(user) || isLocalAdmin(user)
}

/**
 * Get user's role name
 */
export function getUserRoleName(user: UserWithRole | null): string | null {
  if (!user || !user.role) return null
  return user.role.role_name || null
}

/**
 * Check if user can manage roles
 * Only Master Admin and Local Admin can manage roles
 */
export function canManageRoles(user: UserWithRole | null): boolean {
  return isAdmin(user)
}

/**
 * Check if user can manage users
 * Only Master Admin and Local Admin can manage users
 */
export function canManageUsers(user: UserWithRole | null): boolean {
  return isAdmin(user)
}

/**
 * Check if user can manage other admins
 * Only Master Admin can manage other admins
 */
export function canManageOtherAdmins(user: UserWithRole | null): boolean {
  return isMasterAdmin(user)
}

/**
 * Check if user can view data from a specific team
 */
export function canViewTeamData(user: UserWithRole | null, teamId: string | null): boolean {
  if (!user || !teamId) return false

  // Master Admin can view any team
  if (isMasterAdmin(user)) return true

  // Other users can only view their own team
  return user.team_id === teamId
}

/**
 * Check if user can manage data in a specific team
 * (must be admin and in that team, or Master Admin)
 */
export function canManageTeamData(user: UserWithRole | null, teamId: string | null): boolean {
  if (!user || !teamId) return false

  // Master Admin can manage any team
  if (isMasterAdmin(user)) return true

  // Local Admin can only manage their own team
  if (isLocalAdmin(user)) {
    return user.team_id === teamId
  }

  return false
}

/**
 * Check if user can perform action on another user
 * Rules:
 * - Master Admin can do anything
 * - Local Admin can manage users in their team but not other admins
 * - Regular users can't manage anyone
 */
export function canManageUser(
  actor: UserWithRole | null,
  target: UserWithRole | null
): boolean {
  if (!actor || !target) return false

  // Master Admin can manage anyone
  if (isMasterAdmin(actor)) return true

  // Local Admin can manage users in their team
  if (isLocalAdmin(actor)) {
    // Can't manage other admins (Master or Local)
    if (isMasterAdmin(target) || isLocalAdmin(target)) return false

    // Can manage regular users in same team
    return actor.team_id === target.team_id
  }

  // Regular users can't manage anyone
  return false
}

/**
 * Get admin level/tier of a user
 */
export type AdminTier = 'master_admin' | 'local_admin' | 'user'

export function getAdminTier(user: UserWithRole | null): AdminTier {
  if (!user) return 'user'
  if (isMasterAdmin(user)) return 'master_admin'
  if (isLocalAdmin(user)) return 'local_admin'
  return 'user'
}

/**
 * Check if one user has higher admin privilege than another
 */
export function hasHigherPrivilege(actor: UserWithRole | null, target: UserWithRole | null): boolean {
  const actorTier = getAdminTier(actor)
  const targetTier = getAdminTier(target)

  const tierRanking = {
    'master_admin': 3,
    'local_admin': 2,
    'user': 1,
  }

  return tierRanking[actorTier] > tierRanking[targetTier]
}
