/**
 * Roles API Functions
 * Functions to manage roles, permissions, and role-permission associations
 */

import { supabase, createServerClient } from '@/lib/supabase/client';
import { getCurrentUserTeamId } from '@/lib/supabase/auth-server';
import { isMasterAdmin } from '@/lib/utils/role-helpers';
import type { Database } from '@/types/database';
import type { ApiResponse, ApiArrayResponse, ApiVoidResponse } from '@/types/api';

type Role = Database['public']['Tables']['roles']['Row'];
type Permission = Database['public']['Tables']['permissions']['Row'];
type RolePermission = Database['public']['Tables']['role_permissions']['Row'];

type RoleWithPermissions = {
  role: Role;
  permissions: any[];
};

type GroupedPermissions = Record<string, Permission[]>;

/**
 * Get all roles available in the system
 * Master Admin sees all roles, Local Admin sees all roles (but can only modify their own)
 */
export async function getRoles(): Promise<ApiArrayResponse<Role>> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('role_name', { ascending: true });

    if (error) {
      console.error('Error fetching roles:', error);
      return { error: error.message };
    }

    return { data: data as Role[] };
  } catch (error) {
    console.error('Get roles error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get a single role with all its permissions
 */
export async function getRoleById(roleId: string): Promise<ApiResponse<RoleWithPermissions>> {
  try {
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('role_id', roleId)
      .single();

    if (roleError) {
      return { error: roleError.message };
    }

    // Get permissions for this role
    const { data: permissions, error: permError } = await supabase
      .from('role_permissions')
      .select(`
        permission_id,
        allowed,
        permission:permissions(*)
      `)
      .eq('role_id', roleId)
      .eq('allowed', true);

    if (permError) {
      console.error('Error fetching permissions:', permError);
      return { data: { role: role as Role, permissions: [] } };
    }

    return { data: { role: role as Role, permissions: permissions as any[] } };
  } catch (error) {
    console.error('Get role error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Create a new role
 * Only Master Admin and Local Admin can create roles
 */
export async function createRole(name: string, description?: string): Promise<ApiResponse<Role>> {
  try {
    const serverClient = createServerClient();

    // Create the role
    const { data, error } = await (serverClient.from('roles') as any)
      .insert({
        role_name: name,
        role_description: description || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating role:', error);
      return { error: error.message };
    }

    return { data: data as Role };
  } catch (error) {
    console.error('Create role error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Update a role
 * Only Master Admin can update roles
 */
export async function updateRole(
  roleId: string,
  updates: {
    role_name?: string;
    role_description?: string | null;
  }
): Promise<ApiResponse<Role>> {
  try {
    const serverClient = createServerClient();

    const { data, error } = await (serverClient.from('roles') as any)
      .update(updates)
      .eq('role_id', roleId)
      .select()
      .single();

    if (error) {
      console.error('Error updating role:', error);
      return { error: error.message };
    }

    return { data: data as Role };
  } catch (error) {
    console.error('Update role error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Delete a role
 * Only Master Admin can delete roles
 */
export async function deleteRole(roleId: string): Promise<ApiVoidResponse> {
  try {
    const serverClient = createServerClient();

    // First, check if any users have this role
    const { count, error: countError } = await serverClient
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', roleId);

    if (countError) {
      return { error: 'Failed to check role usage' };
    }

    if (count && count > 0) {
      return { error: 'Cannot delete role: users are assigned to this role' };
    }

    // Delete role permissions first
    await serverClient
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId);

    // Delete the role
    const { error } = await serverClient
      .from('roles')
      .delete()
      .eq('role_id', roleId);

    if (error) {
      console.error('Error deleting role:', error);
      return { error: error.message };
    }

    return { data: true };
  } catch (error) {
    console.error('Delete role error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get all permissions grouped by module
 */
export async function getAllPermissions(): Promise<ApiResponse<GroupedPermissions>> {
  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('module_name, permission_key');

    if (error) {
      console.error('Error fetching permissions:', error);
      return { error: error.message };
    }

    // Group by module
    const grouped: Record<string, Permission[]> = {};
    (data as Permission[]).forEach((perm) => {
      const module = (perm as any).module_name || (perm as any).module || 'Other';
      if (!grouped[module]) {
        grouped[module] = [];
      }
      grouped[module].push(perm);
    });

    return { data: grouped };
  } catch (error) {
    console.error('Get all permissions error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get permissions for a specific role
 */
export async function getRolePermissions(roleId: string): Promise<ApiArrayResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        permission_id,
        allowed,
        permission:permissions(*)
      `)
      .eq('role_id', roleId)
      .eq('allowed', true);

    if (error) {
      console.error('Error fetching role permissions:', error);
      return { error: error.message };
    }

    return { data: data as any[] };
  } catch (error) {
    console.error('Get role permissions error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Assign a permission to a role
 */
export async function assignPermissionToRole(roleId: string, permissionId: string): Promise<ApiArrayResponse<RolePermission>> {
  try {
    const serverClient = createServerClient();

    const { data, error } = await (serverClient.from('role_permissions') as any)
      .upsert({
        role_id: roleId,
        permission_id: permissionId,
        allowed: true,
      })
      .select();

    if (error) {
      console.error('Error assigning permission:', error);
      return { error: error.message };
    }

    return { data: data as RolePermission[] };
  } catch (error) {
    console.error('Assign permission error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Revoke a permission from a role
 */
export async function revokePermissionFromRole(roleId: string, permissionId: string): Promise<ApiVoidResponse> {
  try {
    const serverClient = createServerClient();

    const { error } = await serverClient
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_id', permissionId);

    if (error) {
      console.error('Error revoking permission:', error);
      return { error: error.message };
    }

    return { data: true };
  } catch (error) {
    console.error('Revoke permission error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Bulk assign permissions to a role
 * Useful for setting up role templates
 */
export async function assignPermissionsToRole(
  roleId: string,
  permissionIds: string[]
): Promise<ApiArrayResponse<RolePermission>> {
  try {
    const serverClient = createServerClient();

    // First, remove all existing permissions for this role
    await (serverClient.from('role_permissions') as any)
      .delete()
      .eq('role_id', roleId);

    // Then add the new permissions
    const inserts = permissionIds.map((permissionId) => ({
      role_id: roleId,
      permission_id: permissionId,
      allowed: true,
    }));

    const { data, error } = await (serverClient.from('role_permissions') as any)
      .insert(inserts)
      .select();

    if (error) {
      console.error('Error assigning permissions:', error);
      return { error: error.message };
    }

    return { data: data as RolePermission[] };
  } catch (error) {
    console.error('Assign permissions error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get role statistics
 * Returns count of users, permissions, etc.
 */
export async function getRoleStats(roleId: string): Promise<ApiResponse<{ userCount: number; permissionCount: number }>> {
  try {
    // Count users with this role
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', roleId);

    // Count permissions assigned to this role
    const { count: permissionCount } = await supabase
      .from('role_permissions')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', roleId)
      .eq('allowed', true);

    return {
      data: {
        userCount: userCount || 0,
        permissionCount: permissionCount || 0,
      },
    };
  } catch (error) {
    console.error('Get role stats error:', error);
    return { error: 'Failed to fetch role statistics' };
  }
}

/**
 * Create role from template
 * Copies permissions from one role to another
 */
export async function createRoleFromTemplate(
  name: string,
  templateRoleId: string,
  description?: string
): Promise<ApiResponse<Role>> {
  try {
    const serverClient = createServerClient();

    // Create new role
    const { data: newRole, error: roleError } = await (serverClient.from('roles') as any)
      .insert({
        role_name: name,
        role_description: description || null,
      })
      .select()
      .single();

    if (roleError || !newRole) {
      return { error: roleError?.message || 'Failed to create role' };
    }

    // Get permissions from template
    const { data: templatePermissions, error: permError } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', templateRoleId)
      .eq('allowed', true);

    if (permError) {
      // Delete the role we just created
      await (serverClient.from('roles') as any).delete().eq('role_id', (newRole as any).role_id);
      return { error: 'Failed to copy permissions from template' };
    }

    // Assign permissions to new role
    if (templatePermissions && templatePermissions.length > 0) {
      const inserts = templatePermissions.map((rp: any) => ({
        role_id: (newRole as any).role_id,
        permission_id: rp.permission_id,
        allowed: true,
      }));

      const { error: insertError } = await (serverClient.from('role_permissions') as any)
        .insert(inserts);

      if (insertError) {
        // Delete the role we just created
        await (serverClient.from('roles') as any).delete().eq('role_id', (newRole as any).role_id);
        return { error: 'Failed to assign permissions to role' };
      }
    }

    return { data: newRole as Role };
  } catch (error) {
    console.error('Create role from template error:', error);
    return { error: 'An unexpected error occurred' };
  }
}
