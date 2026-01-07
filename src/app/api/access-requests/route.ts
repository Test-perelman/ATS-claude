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
