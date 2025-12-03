/**
 * Permission Checking Hooks
 * React hooks for checking user permissions and roles in components
 * These hooks use the cached permissions from AuthContext for performance
 */

'use client';

import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Hook to check if user has a specific permission
 * @param permissionKey - The permission key to check (e.g., 'candidate.create')
 * @returns boolean indicating if user has the permission
 */
export function usePermission(permissionKey: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permissionKey);
}

/**
 * Hook to check if user has ANY of the specified permissions
 * @param permissionKeys - Array of permission keys
 * @returns boolean indicating if user has any of the permissions
 */
export function useAnyPermission(permissionKeys: string[]): boolean {
  const { hasAnyPermission } = useAuth();
  return hasAnyPermission(permissionKeys);
}

/**
 * Hook to check if user has ALL of the specified permissions
 * @param permissionKeys - Array of permission keys
 * @returns boolean indicating if user has all of the permissions
 */
export function useAllPermissions(permissionKeys: string[]): boolean {
  const { hasAllPermissions } = useAuth();
  return hasAllPermissions(permissionKeys);
}

/**
 * Hook to check if user is Master Admin
 * Master Admin has access to all teams and can configure system-wide settings
 * @returns boolean indicating if user is Master Admin
 */
export function useMasterAdmin(): boolean {
  const { isMasterAdmin } = useAuth();
  return isMasterAdmin;
}

/**
 * Hook to check if user is Local Admin
 * Local Admin is an admin for their team only
 * @returns boolean indicating if user is Local Admin
 */
export function useLocalAdmin(): boolean {
  const { isLocalAdmin } = useAuth();
  return isLocalAdmin;
}

/**
 * Hook to check if user is any type of admin (Master or Local)
 * @returns boolean indicating if user is an admin
 */
export function useIsAdmin(): boolean {
  const { isMasterAdmin, isLocalAdmin } = useAuth();
  return isMasterAdmin || isLocalAdmin;
}

/**
 * Hook to check if user can manage roles
 * Only Master Admin and Local Admin can manage roles
 * @returns boolean indicating if user can manage roles
 */
export function useCanManageRoles(): boolean {
  const { canManageRoles } = useAuth();
  return canManageRoles;
}

/**
 * Hook to check if user can manage users
 * Only Master Admin and Local Admin can manage users
 * @returns boolean indicating if user can manage users
 */
export function useCanManageUsers(): boolean {
  const { canManageUsers } = useAuth();
  return canManageUsers;
}

/**
 * Hook to get user's role name
 * @returns string | null - The user's role name or null if not assigned
 */
export function useUserRole(): string | null {
  const { userRole } = useAuth();
  return userRole;
}

/**
 * Hook to get user's cached permissions
 * @returns string[] - Array of permission keys the user has
 */
export function useUserPermissions(): string[] {
  const { userPermissions } = useAuth();
  return userPermissions;
}

/**
 * Hook to get team ID of current user
 * Master Admin might not have a single team_id, so this returns their assigned team
 * @returns string | null - The user's team ID
 */
export function useTeamId(): string | null {
  const { teamId } = useAuth();
  return teamId;
}

/**
 * Hook to check if user can view specific team's data
 * Master Admin can view any team, others can only view their own team
 * @param teamId - Team ID to check access for
 * @returns boolean indicating if user can view the team's data
 */
export function useCanViewTeamData(teamId: string | null): boolean {
  const { isMasterAdmin, teamId: userTeamId } = useAuth();

  if (!teamId) return false;

  // Master Admin can view any team
  if (isMasterAdmin) return true;

  // Others can only view their team
  return userTeamId === teamId;
}

/**
 * Hook to conditionally render content based on permission
 * Usage:
 * const CanDeleteCandidates = useRenderIfPermission(PERMISSIONS.CANDIDATE_DELETE);
 *
 * @param permissionKey - The permission to check
 * @returns boolean indicating if content should render
 */
export function useRenderIfPermission(permissionKey: string): boolean {
  return usePermission(permissionKey);
}

/**
 * Hook to conditionally render content based on being admin
 * @returns boolean indicating if user is admin
 */
export function useRenderIfAdmin(): boolean {
  return useIsAdmin();
}

/**
 * Hook to conditionally render content for Master Admin only
 * @returns boolean indicating if user is Master Admin
 */
export function useRenderIfMasterAdmin(): boolean {
  return useMasterAdmin();
}

/**
 * Hook to conditionally render content for Local Admin only
 * @returns boolean indicating if user is Local Admin
 */
export function useRenderIfLocalAdmin(): boolean {
  return useLocalAdmin();
}

/**
 * Hook that returns all auth context data for advanced use cases
 * Warning: This returns the entire auth state, use specific hooks when possible
 */
export function useAuthContext() {
  return useAuth();
}
