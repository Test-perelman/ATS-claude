/**
 * Role-Based Helper Functions
 * Utility functions for checking user roles and team access
 */

import type { Database } from '@/types/database';

type User = Database['public']['Tables']['users']['Row'] & {
  role_id: Database['public']['Tables']['roles']['Row'] | null;
};

/**
 * Check if user is Master Admin
 */
export function isMasterAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.is_master_admin === true;
}

/**
 * Check if user is Local Admin
 */
export function isLocalAdmin(user: User | null): boolean {
  if (!user || !user.role_id) return false;
  return (user.role_id as any)?.role_name === 'Local Admin';
}

/**
 * Check if user is any type of admin (Master or Local)
 */
export function isAdmin(user: User | null): boolean {
  return isMasterAdmin(user) || isLocalAdmin(user);
}

/**
 * Get user's role name
 */
export function getUserRoleName(user: User | null): string | null {
  if (!user || !user.role_id) return null;
  return (user.role_id as any)?.role_name || null;
}

/**
 * Check if user can manage roles
 * Only Master Admin and Local Admin can manage roles
 */
export function canManageRoles(user: User | null): boolean {
  return isAdmin(user);
}

/**
 * Check if user can manage users
 * Only Master Admin and Local Admin can manage users
 */
export function canManageUsers(user: User | null): boolean {
  return isAdmin(user);
}

/**
 * Check if user can manage other admins
 * Only Master Admin can manage other admins
 */
export function canManageOtherAdmins(user: User | null): boolean {
  return isMasterAdmin(user);
}

/**
 * Get visible team IDs for a user
 * Master Admin sees all teams, Local Admin/regular users see only their team
 */
export function getVisibleTeamIds(user: User | null): string[] {
  if (!user) return [];

  if (isMasterAdmin(user)) {
    // Master Admin will fetch all teams separately
    return ['*']; // Wildcard indicating "all teams"
  }

  if (user.team_id) {
    return [user.team_id];
  }

  return [];
}

/**
 * Check if user can view data from a specific team
 */
export function canViewTeamData(user: User | null, teamId: string | null): boolean {
  if (!user || !teamId) return false;

  // Master Admin can view any team
  if (isMasterAdmin(user)) return true;

  // Other users can only view their own team
  return user.team_id === teamId;
}

/**
 * Check if user can manage data in a specific team
 * (must be admin and in that team, or Master Admin)
 */
export function canManageTeamData(user: User | null, teamId: string | null): boolean {
  if (!user || !teamId) return false;

  // Master Admin can manage any team
  if (isMasterAdmin(user)) return true;

  // Local Admin can only manage their own team
  if (isLocalAdmin(user)) {
    return user.team_id === teamId;
  }

  return false;
}

/**
 * Check if user can perform action on another user
 * Rules:
 * - Master Admin can do anything
 * - Local Admin can manage users in their team but not other admins
 * - Regular users can't manage anyone
 */
export function canManageUser(
  actor: User | null,
  target: User | null
): boolean {
  if (!actor || !target) return false;

  // Master Admin can manage anyone
  if (isMasterAdmin(actor)) return true;

  // Local Admin can manage users in their team
  if (isLocalAdmin(actor)) {
    // Can't manage other admins (Master or Local)
    if (isMasterAdmin(target) || isLocalAdmin(target)) return false;

    // Can manage regular users in same team
    return actor.team_id === target.team_id;
  }

  // Regular users can't manage anyone
  return false;
}

/**
 * Get admin level/tier of a user
 */
export type AdminTier = 'master_admin' | 'local_admin' | 'user';

export function getAdminTier(user: User | null): AdminTier {
  if (!user) return 'user';
  if (isMasterAdmin(user)) return 'master_admin';
  if (isLocalAdmin(user)) return 'local_admin';
  return 'user';
}

/**
 * Check if one user has higher admin privilege than another
 */
export function hasHigherPrivilege(actor: User | null, target: User | null): boolean {
  const actorTier = getAdminTier(actor);
  const targetTier = getAdminTier(target);

  const tierRanking = {
    'master_admin': 3,
    'local_admin': 2,
    'user': 1,
  };

  return tierRanking[actorTier] > tierRanking[targetTier];
}
