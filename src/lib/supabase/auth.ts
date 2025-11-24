import { supabase, createServerClient } from './client';
import type { Database } from '@/types/database';

/**
 * Admin Sign Up
 * Creates a new team and assigns the first admin user
 */
export async function adminSignUp(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  teamName?: string;
  subscriptionTier?: 'basic' | 'professional' | 'enterprise';
}) {
  try {
    // Step 1: Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError || !authData.user) {
      return { error: authError?.message || 'Failed to create auth user' };
    }

    const userId = authData.user.id;

    // Step 2: Create team
    const serverClient = createServerClient();
    const { data: teamData, error: teamError } = await serverClient
      .from('teams')
      .insert({
        team_name: data.teamName || data.companyName,
        company_name: data.companyName,
        subscription_tier: data.subscriptionTier || 'basic',
        is_active: true,
      } as Database['public']['Tables']['teams']['Insert'])
      .select()
      .single();

    if (teamError || !teamData) {
      // Clean up auth user if team creation fails
      await supabase.auth.admin.deleteUser(userId);
      return { error: teamError?.message || 'Failed to create team' };
    }

    const teamId = teamData.team_id;

    // Step 3: Get or create "Admin" role
    let { data: roleData, error: roleError } = await serverClient
      .from('roles')
      .select('role_id')
      .eq('role_name', 'Admin')
      .single();

    let roleId: string;

    if (roleError || !roleData) {
      // Create Admin role if it doesn't exist
      const { data: newRole, error: newRoleError } = await serverClient
        .from('roles')
        .insert({
          role_name: 'Admin',
          role_description: 'Team administrator with full access',
        } as Database['public']['Tables']['roles']['Insert'])
        .select('role_id')
        .single();

      if (newRoleError || !newRole) {
        return { error: 'Failed to create admin role' };
      }
      roleId = newRole.role_id;
    } else {
      roleId = roleData.role_id;
    }

    // Step 4: Create user record with team_id
    const { data: userData, error: userError } = await serverClient
      .from('users')
      .insert({
        user_id: userId,
        username: data.email.split('@')[0],
        email: data.email,
        team_id: teamId,
        role_id: roleId,
        status: 'active',
      } as Database['public']['Tables']['users']['Insert'])
      .select()
      .single();

    if (userError || !userData) {
      // Clean up
      await supabase.auth.admin.deleteUser(userId);
      await serverClient.from('teams').delete().eq('team_id', teamId);
      return { error: userError?.message || 'Failed to create user' };
    }

    return {
      success: true,
      user: userData,
      team: teamData,
    };
  } catch (error) {
    console.error('Admin signup error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Admin Sign In
 * Authenticate admin user and return team_id
 */
export async function adminSignIn(email: string, password: string) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return { error: authError?.message || 'Invalid credentials' };
    }

    // Get user record with team_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, role_id(*)')
      .eq('user_id', authData.user.id)
      .single();

    if (userError || !userData) {
      return { error: 'User not found' };
    }

    // Check if user has team_id assigned
    if (!userData.team_id) {
      return { error: 'User is not assigned to a team' };
    }

    return {
      success: true,
      user: userData,
      authUser: authData.user,
    };
  } catch (error) {
    console.error('Admin signin error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get current authenticated user with team context
 */
export async function getCurrentUser() {
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return null;
    }

    const { data: userData, error } = await supabase
      .from('users')
      .select('*, role_id(*)')
      .eq('user_id', authUser.id)
      .single();

    if (error || !userData) {
      return null;
    }

    return userData;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

/**
 * Get current user's team_id
 */
export async function getCurrentUserTeamId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.team_id || null;
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Request access to a team (for Google-authenticated users)
 */
export async function requestTeamAccess(data: {
  email: string;
  firstName: string;
  lastName: string;
  companyEmail: string;
  reason?: string;
  requestedTeamId?: string;
}) {
  try {
    const { data: authUser } = await supabase.auth.getUser();

    const { data: requestData, error } = await supabase
      .from('team_access_requests')
      .insert({
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        company_email: data.companyEmail,
        reason: data.reason,
        requested_team_id: data.requestedTeamId,
        auth_user_id: authUser?.user?.id,
        status: 'pending',
      } as Database['public']['Tables']['team_access_requests']['Insert'])
      .select()
      .single();

    if (error || !requestData) {
      return { error: error?.message || 'Failed to create access request' };
    }

    return { success: true, request: requestData };
  } catch (error) {
    console.error('Request team access error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Check if user has access to a team
 * Used to redirect users to access request form if they don't have team_id
 */
export async function checkTeamAccess(): Promise<{
  hasAccess: boolean;
  teamId?: string;
  teamName?: string;
  requestStatus?: 'pending' | 'approved' | 'rejected';
}> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { hasAccess: false };
    }

    // User has team_id assigned
    if (user.team_id) {
      const { data: teamData } = await supabase
        .from('teams')
        .select('team_id, team_name')
        .eq('team_id', user.team_id)
        .single();

      return {
        hasAccess: true,
        teamId: user.team_id,
        teamName: teamData?.team_name,
      };
    }

    // Check if user has pending access request
    const { data: requestData } = await supabase
      .from('team_access_requests')
      .select('status')
      .eq('auth_user_id', user.user_id)
      .single();

    if (requestData) {
      return {
        hasAccess: false,
        requestStatus: requestData.status as 'pending' | 'approved' | 'rejected',
      };
    }

    return { hasAccess: false };
  } catch (error) {
    console.error('Check team access error:', error);
    return { hasAccess: false };
  }
}

/**
 * Server-side function: Approve team access request
 */
export async function approveAccessRequest(
  requestId: string,
  approvedByUserId: string
) {
  try {
    const serverClient = createServerClient();

    // Get the access request
    const { data: request, error: fetchError } = await serverClient
      .from('team_access_requests')
      .select('*, auth_user_id')
      .eq('request_id', requestId)
      .single();

    if (fetchError || !request) {
      return { error: 'Access request not found' };
    }

    // Verify approver has permission for this team
    const { data: approver } = await serverClient
      .from('users')
      .select('team_id')
      .eq('user_id', approvedByUserId)
      .single();

    if (!approver || approver.team_id !== request.requested_team_id) {
      return { error: 'Not authorized to approve this request' };
    }

    // Update access request status
    const { error: updateError } = await serverClient
      .from('team_access_requests')
      .update({
        status: 'approved',
        reviewed_by: approvedByUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('request_id', requestId);

    if (updateError) {
      return { error: 'Failed to approve access request' };
    }

    // Create user record with team_id
    if (request.auth_user_id) {
      const { error: userError } = await serverClient
        .from('users')
        .insert({
          user_id: request.auth_user_id,
          username: request.email.split('@')[0],
          email: request.email,
          team_id: request.requested_team_id,
          status: 'active',
        } as Database['public']['Tables']['users']['Insert']);

      if (userError) {
        // Check if user already exists (might be duplicate)
        const { data: existingUser } = await serverClient
          .from('users')
          .select('user_id')
          .eq('user_id', request.auth_user_id)
          .single();

        if (!existingUser) {
          return { error: 'Failed to create user record' };
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Approve access request error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Server-side function: Reject team access request
 */
export async function rejectAccessRequest(
  requestId: string,
  rejectedByUserId: string
) {
  try {
    const serverClient = createServerClient();

    // Get the access request
    const { data: request, error: fetchError } = await serverClient
      .from('team_access_requests')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (fetchError || !request) {
      return { error: 'Access request not found' };
    }

    // Verify rejector has permission
    const { data: rejector } = await serverClient
      .from('users')
      .select('team_id')
      .eq('user_id', rejectedByUserId)
      .single();

    if (!rejector || rejector.team_id !== request.requested_team_id) {
      return { error: 'Not authorized to reject this request' };
    }

    // Update access request status
    const { error: updateError } = await serverClient
      .from('team_access_requests')
      .update({
        status: 'rejected',
        reviewed_by: rejectedByUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('request_id', requestId);

    if (updateError) {
      return { error: 'Failed to reject access request' };
    }

    return { success: true };
  } catch (error) {
    console.error('Reject access request error:', error);
    return { error: 'An unexpected error occurred' };
  }
}
