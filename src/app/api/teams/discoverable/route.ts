/**
 * GET /api/teams/discoverable
 *
 * List discoverable teams for new users (v2)
 *
 * This endpoint returns teams that allow new users to request access.
 * Used in the "Join Team" flow during signup.
 *
 * No authentication required (public endpoint, for signup flow)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Query discoverable teams with metadata
    const { data: teams, error } = await (supabase.from('team_settings') as any)
      .select(`
        team_id,
        description,
        teams!inner(
          id,
          name
        )
      `)
      .eq('is_discoverable', true)
      .order('teams(name)', { ascending: true })

    if (error) {
      console.error('[discoverable-teams] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch teams' },
        { status: 500 }
      )
    }

    // Get member count for each team
    const teamsWithCount = await Promise.all(
      (teams || []).map(async (teamSettings: any) => {
        const { count } = await supabase
          .from('team_memberships')
          .select('*', { count: 'exact' })
          .eq('team_id', teamSettings.team_id)
          .eq('status', 'approved')

        return {
          id: teamSettings.teams.id,
          name: teamSettings.teams.name,
          description: teamSettings.description || null,
          memberCount: count || 0,
        }
      })
    )

    return NextResponse.json(
      {
        success: true,
        data: teamsWithCount,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[discoverable-teams] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
