'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
        // Fetch session from API route
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch session');
        }

        const result = await response.json();

        if (!result.success || !result.data) {
          setState((prev) => ({
            ...prev,
            loading: false,
          }));
          return;
        }

        const { user, isMasterAdmin, isLocalAdmin, userRole, userPermissions, teamId, teamName } = result.data;

        // Create permission checking functions
        const hasPermissionFn = (permissionKey: string): boolean => {
          // Master Admin has all permissions
          if (isMasterAdmin) return true;
          return userPermissions.includes(permissionKey);
        };

        const hasAnyPermissionFn = (permissionKeys: string[]): boolean => {
          if (isMasterAdmin) return true;
          return permissionKeys.some((key: string) => userPermissions.includes(key));
        };

        const hasAllPermissionsFn = (permissionKeys: string[]): boolean => {
          if (isMasterAdmin) return true;
          return permissionKeys.every((key: string) => userPermissions.includes(key));
        };

        setState((prev) => ({
          ...prev,
          user,
          teamId,
          teamName,
          hasTeamAccess: !!teamId,
          requestStatus: null,
          loading: false,
          isMasterAdmin,
          isLocalAdmin,
          userRole,
          userPermissions,
          hasPermission: hasPermissionFn,
          hasAnyPermission: hasAnyPermissionFn,
          hasAllPermissions: hasAllPermissionsFn,
          canManageRoles: isMasterAdmin || isLocalAdmin,
          canManageUsers: isMasterAdmin || isLocalAdmin,
        }));
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
