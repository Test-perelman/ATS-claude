/**
 * POST /api/auth/create-team
 *
 * Create new team + user + approved membership (v2)
 *
 * User has verified email and chosen "Create Team"
 * This endpoint:
 * 1. Creates team with provided name
 * 2. Clones role templates
 * 3. Creates user record with team_id and local admin role
 * 4. Creates approved membership (auto-approve)
 * 5. Returns user + team
 *
 * Expected request body:
 * {
 *   "teamName": "Acme Corp",
 *   "firstName": "John",
 *   "lastName": "Doe"
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth-server-v2'
import { createTeamAsLocalAdmin } from '@/lib/supabase/auth-server-v2'

export async function POST(request: NextRequest) {
  try {
    // Step 1: Get authenticated user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated. User must complete email verification first.' },
        { status: 401 }
      )
    }

    // User should not have a team yet at this point
    if (user.team_id) {
      return NextResponse.json(
        { error: 'User already belongs to a team. Cannot create a new team.' },
        { status: 400 }
      )
    }

    // Step 2: Parse request
    const body = await request.json()
    const { teamName, firstName, lastName } = body

    if (!teamName || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields: teamName, firstName, lastName' },
        { status: 400 }
      )
    }

    // Step 3: Create team
    console.log('[create-team] Creating team for user:', user.user_id)
    const result = await createTeamAsLocalAdmin({
      authUserId: user.user_id,
      email: user.email,
      teamName,
      firstName,
      lastName,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create team' },
        { status: 500 }
      )
    }

    // Step 4: Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Team created successfully. You are now the team administrator.',
        data: {
          user: result.data?.user,
          team: result.data?.team,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[create-team] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
