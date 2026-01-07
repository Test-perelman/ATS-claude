import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/teams/discoverable
 * Get all discoverable teams (public)
 * No authentication required - returns teams marked as discoverable
 */
export async function GET(request: NextRequest) {
  try {
    // Create admin client to bypass RLS for reading discoverable teams
    const { createAdminClient } = await import('@/lib/supabase/server');
    const supabase = await createAdminClient();

    // Get all discoverable teams with member counts
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(
        `
        id,
        name,
        created_at,
        team_settings:team_settings (
          description,
          is_discoverable
        ),
        team_members:team_memberships (
          id
        )
      `
      )
      .eq('team_settings.is_discoverable', true);

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch teams' },
        { status: 500 }
      );
    }

    // Transform response
    const formattedTeams = (teams || []).map((team: any) => ({
      id: team.id,
      name: team.name,
      description: team.team_settings?.[0]?.description || null,
      member_count: team.team_members?.length || 0,
      created_at: team.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: formattedTeams,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
