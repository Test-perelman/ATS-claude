import { supabase, createServerClient } from './client';
import type { Database } from '@/types/database';
import type { ApiResponse, ApiVoidResponse } from '@/types/api';

type AdminSignUpResponse = {
  user: any;
  team: any;
};

type AdminSignInResponse = {
  user: any;
  authUser: any;
};

type RequestAccessResponse = {
  request: any;
};

type CheckAccessResponse = {
  hasAccess: boolean;
  teamId?: string;
  teamName?: string;
  requestStatus?: 'pending' | 'approved' | 'rejected';
};

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
}): Promise<ApiResponse<AdminSignUpResponse>> {
  try {
    // Use server client for all operations since this runs in an API route
    const serverClient = createServerClient();

    // Step 1: Create Supabase Auth user using admin API
    console.log('Step 1: Creating auth user...');
    const { data: authData, error: authError } = await serverClient.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Auto-confirm email for admin signup
    });

    if (authError || !authData.user) {
      console.error('Auth user creation failed:', authError);
      return { error: authError?.message || 'Failed to create auth user' };
    }

    const userId = authData.user.id;
    console.log('Auth user created:', userId);

    // Step 2: Create team
    console.log('Step 2: Creating team...');
    const { data: teamData, error: teamError } = await (serverClient.from('teams') as any)
      .insert({
        team_name: data.teamName || data.companyName,
        company_name: data.companyName,
        subscription_tier: data.subscriptionTier || 'basic',
        is_active: true,
      })
      .select()
      .single();

    if (teamError || !teamData) {
      console.error('Team creation failed:', teamError);
      // Clean up auth user if team creation fails
      await serverClient.auth.admin.deleteUser(userId);
      return { error: teamError?.message || 'Failed to create team' };
    }

    const teamId = teamData.team_id;
    console.log('Team created:', teamId);

    // Step 3: Get or create "Admin" role
    console.log('Step 3: Getting/creating Admin role...');
    let { data: roleData, error: roleError } = await serverClient
      .from('roles')
      .select('role_id')
      .eq('role_name', 'Admin')
      .single();

    let roleId: string;

    if (roleError || !roleData) {
      // Create Admin role if it doesn't exist
      console.log('Admin role not found, creating...');
      const { data: newRole, error: newRoleError } = await (serverClient.from('roles') as any)
        .insert({
          role_name: 'Admin',
          role_description: 'Team administrator with full access',
        })
        .select('role_id')
        .single();

      if (newRoleError || !newRole) {
        console.error('Admin role creation failed:', newRoleError);
        // Clean up
        await serverClient.auth.admin.deleteUser(userId);
        await serverClient.from('teams').delete().eq('team_id', teamId);
        return { error: 'Failed to create admin role' };
      }
      roleId = (newRole as any).role_id;
    } else {
      roleId = (roleData as any).role_id;
    }
    console.log('Admin role ID:', roleId);

    // Step 4: Create user record with team_id
    console.log('Step 4: Creating user record...');
    const { data: userData, error: userError } = await (serverClient.from('users') as any)
      .insert({
        user_id: userId,
        username: data.email.split('@')[0],
        email: data.email,
        team_id: teamId,
        role_id: roleId,
        status: 'active',
      })
      .select()
      .single();

    if (userError || !userData) {
      console.error('User record creation failed:', userError);
      // Clean up
      await serverClient.auth.admin.deleteUser(userId);
      await serverClient.from('teams').delete().eq('team_id', teamId);
      return { error: userError?.message || 'Failed to create user' };
    }
    console.log('User record created successfully');

    return {
      data: {
        user: userData,
        team: teamData,
      },
    };
  } catch (error) {
    console.error('Admin signup error:', error);
    return { error: 'An unexpected error occurred: ' + (error instanceof Error ? error.message : String(error)) };
  }
}

/**
 * Admin Sign In
 * Authenticate admin user and return team_id
 */
export async function adminSignIn(email: string, password: string): Promise<ApiResponse<AdminSignInResponse>> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      const errorMsg = authError?.message || 'Invalid credentials';
      console.error('Auth error:', errorMsg);
      return { error: errorMsg };
    }

    console.log('Auth successful, userId:', authData.user.id);

    // Get user record with team_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, role_id(*)')
      .eq('user_id', authData.user.id)
      .single();

    if (userError) {
      console.error('User fetch error:', userError);
      return { error: userError?.message || 'Failed to fetch user data' };
    }

    if (!userData) {
      console.error('No user data found for userId:', authData.user.id);
      return { error: 'User not found in database' };
    }

    console.log('User data retrieved:', userData);

    // Check if user has team_id assigned
    const userTeamId = (userData as any).team_id;
    if (!userTeamId) {
      console.warn('User has no team_id assigned. Allowing login to access-request page');
      // Allow login but user will be redirected to access-request page by middleware
      return {
        data: {
          user: userData,
          authUser: authData.user,
        },
      };
    }

    return {
      data: {
        user: userData,
        authUser: authData.user,
      },
    };
  } catch (error) {
    console.error('Admin signin error:', error);
    return { error: 'An unexpected error occurred: ' + String(error) };
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
  return (user as any)?.team_id || null;
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<ApiVoidResponse> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: error.message };
    }
    return { data: true };
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
}): Promise<ApiResponse<RequestAccessResponse>> {
  try {
    const { data: authUser } = await supabase.auth.getUser();

    const { data: requestData, error } = await (supabase.from('team_access_requests') as any)
      .insert({
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        company_email: data.companyEmail,
        reason: data.reason,
        requested_team_id: data.requestedTeamId,
        auth_user_id: authUser?.user?.id,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !requestData) {
      return { error: error?.message || 'Failed to create access request' };
    }

    return { data: { request: requestData } };
  } catch (error) {
    console.error('Request team access error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Check if user has access to a team
 * Used to redirect users to access request form if they don't have team_id
 */
export async function checkTeamAccess(): Promise<CheckAccessResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { hasAccess: false };
    }

    // User has team_id assigned
    const userTeamId = (user as any).team_id;
    if (userTeamId) {
      const { data: teamData } = await supabase
        .from('teams')
        .select('team_id, team_name')
        .eq('team_id', userTeamId)
        .single();

      return {
        hasAccess: true,
        teamId: userTeamId,
        teamName: (teamData as any)?.team_name,
      };
    }

    // Check if user has pending access request
    const { data: requestData } = await supabase
      .from('team_access_requests')
      .select('status')
      .eq('auth_user_id', (user as any).user_id)
      .single();

    if (requestData) {
      return {
        hasAccess: false,
        requestStatus: (requestData as any).status as 'pending' | 'approved' | 'rejected',
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
): Promise<ApiVoidResponse> {
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

    const approverTeamId = (approver as any)?.team_id;
    const requestedTeamId = (request as any)?.requested_team_id;

    if (!approver || approverTeamId !== requestedTeamId) {
      return { error: 'Not authorized to approve this request' };
    }

    // Update access request status
    const { error: updateError } = await (serverClient.from('team_access_requests') as any)
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
    const authUserId = (request as any).auth_user_id;
    const requestEmail = (request as any).email;
    if (authUserId) {
      const { error: userError } = await (serverClient.from('users') as any)
        .insert({
          user_id: authUserId,
          username: requestEmail.split('@')[0],
          email: requestEmail,
          team_id: requestedTeamId,
          status: 'active',
        });

      if (userError) {
        // Check if user already exists (might be duplicate)
        const { data: existingUser } = await serverClient
          .from('users')
          .select('user_id')
          .eq('user_id', authUserId)
          .single();

        if (!existingUser) {
          return { error: 'Failed to create user record' };
        }
      }
    }

    return { data: true };
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
): Promise<ApiVoidResponse> {
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

    const rejectorTeamId = (rejector as any)?.team_id;
    const requestTeamId = (request as any)?.requested_team_id;

    if (!rejector || rejectorTeamId !== requestTeamId) {
      return { error: 'Not authorized to reject this request' };
    }

    // Update access request status
    const { error: updateError } = await (serverClient.from('team_access_requests') as any)
      .update({
        status: 'rejected',
        reviewed_by: rejectedByUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('request_id', requestId);

    if (updateError) {
      return { error: 'Failed to reject access request' };
    }

    return { data: true };
  } catch (error) {
    console.error('Reject access request error:', error);
    return { error: 'An unexpected error occurred' };
  }
}
