'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, checkTeamAccess } from '@/lib/supabase/auth';
import type { Database } from '@/types/database';

interface AuthContextType {
  user: (Database['public']['Tables']['users']['Row'] & {
    role_id: Database['public']['Tables']['roles']['Row'] | null;
  }) | null;
  loading: boolean;
  teamId: string | null;
  teamName: string | null;
  requestStatus: 'pending' | 'approved' | 'rejected' | null;
  hasTeamAccess: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  teamId: null,
  teamName: null,
  requestStatus: null,
  hasTeamAccess: false,
  error: null,
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
          // Check team access status
          const access = await checkTeamAccess();
          setState((prev) => ({
            ...prev,
            hasTeamAccess: access.hasAccess,
            teamId: access.teamId || null,
            teamName: access.teamName || null,
            requestStatus: access.requestStatus || null,
            loading: false,
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
