import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/supabase/user-server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/access-requests
 * Create a new team access request
 * Authenticated users only
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireCurrentUser();

    const body = await request.json();
    const { requested_team_id } = body;

    if (!requested_team_id) {
      return NextResponse.json(
        { success: false, error: 'Team ID is required' },
        { status: 400 }
      );
    }

    const adminSupabase = await createAdminClient();

    // Check if team exists
    const { data: team, error: teamError } = await adminSupabase
      .from('teams')
      .select('id')
      .eq('id', requested_team_id)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check for existing pending request
    const { data: existingRequest, error: checkError } = await adminSupabase
      .from('team_access_requests')
      .select('id')
      .eq('requested_team_id', requested_team_id)
      .eq('email', user.email)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { success: false, error: 'You already have a pending request for this team' },
        { status: 400 }
      );
    }

    // Create access request
    const { data: accessRequest, error: createError } = await adminSupabase
      .from('team_access_requests')
      .insert({
        email: user.email,
        requested_team_id,
        auth_user_id: user.user_id,
        status: 'pending',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating access request:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create access request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: accessRequest,
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: error.status || 500 }
    );
  }
}

/**
 * GET /api/access-requests
 * Get access requests (Master Admin sees all, Team Admin sees their team's)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const teamId = searchParams.get('teamId');

    const adminSupabase = await createAdminClient();

    let query = adminSupabase
      .from('team_access_requests')
      .select(`
        id,
        email,
        first_name,
        last_name,
        requested_team_id,
        status,
        created_at,
        reviewed_at,
        reviewed_by,
        rejection_reason,
        teams:teams(id, name)
      `)
      .eq('status', status);

    // If not master admin, filter to their team only
    if (!user.is_master_admin) {
      if (!teamId) {
        // Get user's team
        const { data: userTeam } = await adminSupabase
          .from('team_memberships')
          .select('team_id')
          .eq('user_id', user.user_id)
          .eq('status', 'approved')
          .single();

        if (!userTeam) {
          return NextResponse.json(
            { success: false, error: 'You are not a member of any team' },
            { status: 403 }
          );
        }

        query = query.eq('requested_team_id', userTeam.team_id);
      } else {
        query = query.eq('requested_team_id', teamId);
      }

      // Verify user is admin of the team
      const { data: adminRole } = await adminSupabase
        .from('team_memberships')
        .select('role:roles(is_admin)')
        .eq('user_id', user.user_id)
        .eq('team_id', teamId || undefined)
        .eq('status', 'approved')
        .single();

      if (!adminRole?.role?.is_admin) {
        return NextResponse.json(
          { success: false, error: 'Only team administrators can view access requests' },
          { status: 403 }
        );
      }
    } else if (teamId) {
      query = query.eq('requested_team_id', teamId);
    }

    const { data: requests, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching access requests:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch access requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: requests || [],
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: error.status || 500 }
    );
  }
}
