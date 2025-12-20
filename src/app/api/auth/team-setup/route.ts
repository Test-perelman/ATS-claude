/**
 * Team Setup API Route
 * POST /api/auth/team-setup
 * Creates a new team and assigns current user as Local Admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { cloneRoleTemplatesForTeam, getLocalAdminRole } from '@/lib/utils/role-helpers'

export async function POST(request: NextRequest) {
  try {
    console.log('[POST /team-setup] Starting team creation...')

    // 1. Get current user
    const user = await getCurrentUser()
    if (!user) {
      console.log('[POST /team-setup] User not authenticated')
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      )
    }

    console.log('[POST /team-setup] User authenticated:', user.user_id)

    // 2. Check if user already has a team
    if (user.team_id) {
      console.log('[POST /team-setup] User already has a team:', user.team_id)
      return NextResponse.json(
        { error: 'User already belongs to a team' },
        { status: 400 }
      )
    }

    // 3. Parse request body
    const { companyName, teamName } = await request.json()

    if (!companyName?.trim() || !teamName?.trim()) {
      return NextResponse.json(
        { error: 'Company name and team name are required' },
        { status: 400 }
      )
    }

    console.log('[POST /team-setup] Creating team:', { companyName, teamName })

    // 4. Create team using admin client
    const adminSupabase = await createAdminClient()

    const { data: teamData, error: teamError } = await (adminSupabase.from('teams') as any)
      .insert({
        team_name: teamName,
        company_name: companyName,
        subscription_tier: 'free',
        is_active: true,
      })
      .select()
      .single()

    if (teamError || !teamData) {
      console.error('[POST /team-setup] Team creation failed:', teamError)
      return NextResponse.json(
        { error: 'Failed to create team' },
        { status: 400 }
      )
    }

    const teamId = (teamData as any).team_id
    console.log('[POST /team-setup] Team created:', teamId)

    // 5. Clone role templates for this team
    console.log('[POST /team-setup] Cloning role templates...')
    const roleIds = await cloneRoleTemplatesForTeam(teamId)
    console.log('[POST /team-setup] Roles created:', roleIds.length)

    // 6. Get Local Admin role
    const localAdminRole = await getLocalAdminRole(teamId)

    if (!localAdminRole) {
      console.error('[POST /team-setup] Local Admin role not found')
      return NextResponse.json(
        { error: 'Failed to create admin role' },
        { status: 400 }
      )
    }

    console.log('[POST /team-setup] Local Admin role:', (localAdminRole as any).role_id)

    // 7. Update user record with team_id and role_id
    console.log('[POST /team-setup] Updating user record...')
    const { data: updatedUser, error: updateError } = await (adminSupabase.from('users') as any)
      .update({
        team_id: teamId,
        role_id: (localAdminRole as any).role_id,
      })
      .eq('user_id', user.user_id)
      .select()
      .single()

    if (updateError || !updatedUser) {
      console.error('[POST /team-setup] User update failed:', updateError)
      return NextResponse.json(
        { error: 'Failed to assign user to team' },
        { status: 400 }
      )
    }

    console.log('[POST /team-setup] ✅ Team setup complete')

    return NextResponse.json({
      success: true,
      data: {
        team: teamData,
        user: updatedUser,
      },
    })
  } catch (error) {
    console.error('[POST /team-setup] Error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
