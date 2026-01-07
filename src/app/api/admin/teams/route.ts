import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/supabase/user-server';
import { createAdminClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

/**
 * POST /api/admin/teams
 * Create a new team (Master Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();

    // Check master admin status
    const { createAdminClient: getAdminClient } = await import('@/lib/supabase/server');
    const supabase = await getAdminClient();
    
    const { data: userData } = await supabase
      .from('users')
      .select('is_master_admin')
      .eq('id', user.user_id)
      .single();

    if (!userData?.is_master_admin) {
      return NextResponse.json(
        { success: false, error: 'Only Master Admin can create teams' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, is_discoverable } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Team name is required' },
        { status: 400 }
      );
    }

    const teamId = randomUUID();

    // Create team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        id: teamId,
        name: name.trim(),
      })
      .select()
      .single();

    if (teamError) {
      console.error('Error creating team:', teamError);
      return NextResponse.json(
        { success: false, error: teamError.message || 'Failed to create team' },
        { status: 400 }
      );
    }

    // Create team settings
    const { error: settingsError } = await supabase
      .from('team_settings')
      .insert({
        team_id: teamId,
        description: description || null,
        is_discoverable: is_discoverable || false,
      });

    if (settingsError) {
      console.error('Error creating team settings:', settingsError);
    }

    // Create default roles
    const roles = ['Team Admin', 'Recruiter', 'Manager', 'Finance', 'Viewer'];
    for (const roleName of roles) {
      await supabase
        .from('roles')
        .insert({
          team_id: teamId,
          name: roleName,
          is_admin: roleName === 'Team Admin',
        });
    }

    return NextResponse.json({
      success: true,
      data: team,
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
 * GET /api/admin/teams
 * Get all teams (Master Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();

    const { createAdminClient: getAdminClient } = await import('@/lib/supabase/server');
    const supabase = await getAdminClient();
    
    const { data: userData } = await supabase
      .from('users')
      .select('is_master_admin')
      .eq('id', user.user_id)
      .single();

    if (!userData?.is_master_admin) {
      return NextResponse.json(
        { success: false, error: 'Only Master Admin can view all teams' },
        { status: 403 }
      );
    }

    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(
        `
        id,
        name,
        created_at,
        updated_at,
        team_settings:team_settings (
          description,
          is_discoverable
        ),
        team_members:team_memberships (
          id
        )
      `
      )
      .order('created_at', { ascending: false });

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch teams' },
        { status: 500 }
      );
    }

    const formattedTeams = (teams || []).map((team: any) => ({
      id: team.id,
      name: team.name,
      description: team.team_settings?.[0]?.description,
      is_discoverable: team.team_settings?.[0]?.is_discoverable,
      member_count: team.team_members?.length || 0,
      created_at: team.created_at,
      updated_at: team.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: formattedTeams,
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: error.status || 500 }
    );
  }
}
