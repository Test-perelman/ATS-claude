'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, checkTeamAccess } from '@/lib/supabase/auth';
import { getRolePermissions } from '@/lib/utils/permissions';
import type { Database } from '@/types/database';

type UserWithRole = Database['public']['Tables']['users']['Row'] & {
  role_id: Database['public']['Tables']['roles']['Row'] | null;
};

interface AuthContextType {
  user: UserWithRole | null;
  loading: boolean;
  teamId: string | null;
  teamName: string | null;
  requestStatus: 'pending' | 'approved' | 'rejected' | null;
  hasTeamAccess: boolean;
  error: string | null;
  // New role and permission fields
  isMasterAdmin: boolean;
  isLocalAdmin: boolean;
  userRole: string | null;
  userPermissions: string[]; // Cached permissions for the user's role
  hasPermission: (permissionKey: string) => boolean;
  hasAnyPermission: (permissionKeys: string[]) => boolean;
  hasAllPermissions: (permissionKeys: string[]) => boolean;
  canManageRoles: boolean; // Master Admin or Local Admin
  canManageUsers: boolean; // Master Admin or Local Admin
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  teamId: null,
  teamName: null,
  requestStatus: null,
  hasTeamAccess: false,
  error: null,
  isMasterAdmin: false,
  isLocalAdmin: false,
  userRole: null,
  userPermissions: [],
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  canManageRoles: false,
  canManageUsers: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthContextType>({
    user: null,
    loading: true,
    teamId: null,
    teamName: null,
    requestStatus: null,
    hasTeamAccess: false,
    error: null,
    isMasterAdmin: false,
    isLocalAdmin: false,
    userRole: null,
    userPermissions: [],
    hasPermission: () => false,
    hasAnyPermission: () => false,
    hasAllPermissions: () => false,
    canManageRoles: false,
    canManageUsers: false,
  });

  useEffect(() => {
    async function initAuth() {
      try {
        // Get current user
        const user = await getCurrentUser();
        setState((prev) => ({
          ...prev,
          user,
        }));

        if (user) {
          // Get user's role name and permissions
          const roleName = (user as any).role_id?.role_name || null;
          let userPermissions: string[] = [];
          let isMasterAdmin = false;
          let isLocalAdmin = false;

          // Check if Master Admin
          isMasterAdmin = (user as any).is_master_admin === true;

          // Check if Local Admin
          if (roleName === 'Local Admin') {
            isLocalAdmin = true;
          }

          // Fetch and cache user's permissions
          if (user.role_id) {
            userPermissions = await getRolePermissions((user as any).role_id.role_id);
          }

          // Check team access status
          const access = await checkTeamAccess();

          // Create permission checking functions
          const hasPermissionFn = (permissionKey: string): boolean => {
            // Master Admin has all permissions
            if (isMasterAdmin) return true;
            return userPermissions.includes(permissionKey);
          };

          const hasAnyPermissionFn = (permissionKeys: string[]): boolean => {
            if (isMasterAdmin) return true;
            return permissionKeys.some((key) => userPermissions.includes(key));
          };

          const hasAllPermissionsFn = (permissionKeys: string[]): boolean => {
            if (isMasterAdmin) return true;
            return permissionKeys.every((key) => userPermissions.includes(key));
          };

          setState((prev) => ({
            ...prev,
            hasTeamAccess: access.hasAccess,
            teamId: access.teamId || null,
            teamName: access.teamName || null,
            requestStatus: access.requestStatus || null,
            loading: false,
            // Set role and permission data
            isMasterAdmin,
            isLocalAdmin,
            userRole: roleName,
            userPermissions,
            hasPermission: hasPermissionFn,
            hasAnyPermission: hasAnyPermissionFn,
            hasAllPermissions: hasAllPermissionsFn,
            canManageRoles: isMasterAdmin || isLocalAdmin,
            canManageUsers: isMasterAdmin || isLocalAdmin,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            loading: false,
          }));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setState((prev) => ({
          ...prev,
          error: 'Failed to initialize authentication',
          loading: false,
        }));
      }
    }

    initAuth();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
