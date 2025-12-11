/**
 * Teams API Endpoint
 * GET /api/teams - List all teams (master admin only)
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/teams
 * List all teams (master admin only)
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only master admins can list all teams
    if (!user.is_master_admin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only master admins can list all teams' },
        { status: 403 }
      )
    }

    const supabase = await createServerClient()

    const { data: teams, error } = await supabase
      .from('teams')
      .select('team_id, team_name, company_name, subscription_tier, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('team_name')

    if (error) {
      console.error('Query teams error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch teams' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: teams || [],
    })
  } catch (error) {
    console.error('Get teams API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
