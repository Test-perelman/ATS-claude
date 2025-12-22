/**
 * POST /api/auth/join-team
 *
 * Request access to existing team (v2)
 *
 * User has verified email and chosen "Join Team"
 * This endpoint:
 * 1. Creates user record with team_id but NO role_id
 * 2. Creates pending membership (status='pending')
 * 3. Returns user + membership with status='pending'
 * 4. User awaits admin approval
 *
 * Expected request body:
 * {
 *   "teamId": "existing-team-uuid",
 *   "firstName": "Jane",
 *   "lastName": "Doe",
 *   "requestedRole": "Member",  // optional
 *   "message": "I want to join..."  // optional
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth-server-v2'
import { joinTeamAsNewMember } from '@/lib/supabase/auth-server-v2'

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
        { error: 'User already belongs to a team. Cannot join another team.' },
        { status: 400 }
      )
    }

    // Step 2: Parse request
    const body = await request.json()
    const { teamId, firstName, lastName, requestedRole, message } = body

    if (!teamId || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields: teamId, firstName, lastName' },
        { status: 400 }
      )
    }

    // Step 3: Request team access
    console.log('[join-team] Requesting access to team:', teamId, 'for user:', user.user_id)
    const result = await joinTeamAsNewMember({
      authUserId: user.user_id,
      email: user.email,
      teamId,
      firstName,
      lastName,
      requestedRoleId: requestedRole,
      message,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to request team access' },
        { status: 500 }
      )
    }

    // Step 4: Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Access request sent. Waiting for team administrator approval.',
        data: {
          user: result.data?.user,
          membership: result.data?.membership,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[join-team] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
