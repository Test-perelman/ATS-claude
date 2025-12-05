import { supabase, createServerClient, typedUpdate } from '@/lib/supabase/client';
import { getCurrentUserTeamId } from '@/lib/supabase/auth';
import type { Database } from '@/types/database';
import type { ApiResponse, ApiArrayResponse, ApiVoidResponse } from '@/types/api';

/**
 * Get current user's team
 */
export async function getTeam(): Promise<ApiResponse<Database['public']['Tables']['teams']['Row']>> {
  try {
    const teamId = await getCurrentUserTeamId();

    if (!teamId) {
      return { error: 'User not associated with a team' };
    }

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('team_id', teamId)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    console.error('Get team error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Update team information
 */
export async function updateTeam(updates: Database['public']['Tables']['teams']['Update']): Promise<ApiResponse<Database['public']['Tables']['teams']['Row']>> {
  try {
    const teamId = await getCurrentUserTeamId();

    if (!teamId) {
      return { error: 'User not associated with a team' };
    }

    const { data, error } = await typedUpdate('teams', 'team_id', teamId, updates);

    if (error) {
      return { error: error.message };
    }

    if (!data) {
      return { error: 'Failed to update team' };
    }

    return { data };
  } catch (error) {
    console.error('Update team error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get all team members
 */
export async function getTeamMembers(): Promise<ApiArrayResponse<any>> {
  try {
    const teamId = await getCurrentUserTeamId();

    if (!teamId) {
      return { error: 'User not associated with a team' };
    }

    const { data, error } = await supabase
      .from('users')
      .select('user_id, username, email, status, created_at, role_id(*)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    console.error('Get team members error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get a single team member
 */
export async function getTeamMember(userId: string): Promise<ApiResponse<Database['public']['Tables']['users']['Row']>> {
  try {
    const teamId = await getCurrentUserTeamId();

    if (!teamId) {
      return { error: 'User not associated with a team' };
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    console.error('Get team member error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Update team member (role, status, etc.)
 * Only team admins can do this
 */
export async function updateTeamMember(
  userId: string,
  updates: {
    role_id?: string;
    status?: string;
  }
): Promise<ApiResponse<any>> {
  try {
    const teamId = await getCurrentUserTeamId();

    if (!teamId) {
      return { error: 'User not associated with a team' };
    }

    // Verify target user is in the same team
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('team_id')
      .eq('user_id', userId)
      .single();

    if (fetchError || !targetUser) {
      return { error: 'User not found in your team' };
    }

    const userTeamId = (targetUser as { team_id: string | null }).team_id;
    if (userTeamId !== teamId) {
      return { error: 'User not found in your team' };
    }

    const { data, error } = await (supabase.from('users') as any)
      .update(updates)
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    console.error('Update team member error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Remove user from team (server-side only)
 */
export async function removeTeamMember(userId: string, teamId: string): Promise<ApiVoidResponse> {
  try {
    const serverClient = createServerClient();

    // Verify user is in this team
    const { data: user } = await serverClient
      .from('users')
      .select('user_id')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();

    if (!user) {
      return { error: 'User not found in team' };
    }

    // Delete the user record
    const { error } = await serverClient
      .from('users')
      .delete()
      .eq('user_id', userId);

    if (error) {
      return { error: error.message };
    }

    return { data: true };
  } catch (error) {
    console.error('Remove team member error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get all pending access requests for team (admin only)
 */
export async function getPendingAccessRequests(): Promise<ApiArrayResponse<Database['public']['Tables']['team_access_requests']['Row']>> {
  try {
    const teamId = await getCurrentUserTeamId();

    if (!teamId) {
      return { error: 'User not associated with a team' };
    }

    const { data, error } = await supabase
      .from('team_access_requests')
      .select('*')
      .eq('requested_team_id', teamId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    console.error('Get pending access requests error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get all access requests for team (admin only)
 */
export async function getAccessRequests(status?: 'pending' | 'approved' | 'rejected'): Promise<ApiArrayResponse<Database['public']['Tables']['team_access_requests']['Row']>> {
  try {
    const teamId = await getCurrentUserTeamId();

    if (!teamId) {
      return { error: 'User not associated with a team' };
    }

    let query = supabase
      .from('team_access_requests')
      .select('*')
      .eq('requested_team_id', teamId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    console.error('Get access requests error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Server-side: Approve access request and create user
 */
export async function approveAccessRequest(requestId: string, teamId: string): Promise<ApiVoidResponse> {
  try {
    const serverClient = createServerClient();

    // Get the request
    const { data: request, error: fetchError } = await serverClient
      .from('team_access_requests')
      .select('*')
      .eq('request_id', requestId)
      .eq('requested_team_id', teamId)
      .single();

    if (fetchError || !request) {
      return { error: 'Access request not found' };
    }

    const authUserId = (request as any).auth_user_id;
    if (!authUserId) {
      return { error: 'Auth user ID not found' };
    }

    // Update request status
    const { error: updateError } = await (serverClient.from('team_access_requests') as any)
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('request_id', requestId);

    if (updateError) {
      return { error: 'Failed to approve request' };
    }

    // Create user record with team_id
    const requestEmail = (request as any).email;
    const { error: userError } = await (serverClient.from('users') as any)
      .insert({
        user_id: authUserId,
        username: requestEmail.split('@')[0],
        email: requestEmail,
        team_id: teamId,
        status: 'active',
      });

    if (userError) {
      return { error: 'Failed to create user record' };
    }

    return { data: true };
  } catch (error) {
    console.error('Approve access request error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Server-side: Reject access request
 */
export async function rejectAccessRequest(requestId: string, teamId: string): Promise<ApiVoidResponse> {
  try {
    const serverClient = createServerClient();

    // Get the request
    const { data: request, error: fetchError } = await serverClient
      .from('team_access_requests')
      .select('*')
      .eq('request_id', requestId)
      .eq('requested_team_id', teamId)
      .single();

    if (fetchError || !request) {
      return { error: 'Access request not found' };
    }

    // Update request status
    const { error: updateError } = await (serverClient.from('team_access_requests') as any)
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .eq('request_id', requestId);

    if (updateError) {
      return { error: 'Failed to reject request' };
    }

    return { data: true };
  } catch (error) {
    console.error('Reject access request error:', error);
    return { error: 'An unexpected error occurred' };
  }
}
