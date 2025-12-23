/**
 * GET /api/admin/pending-memberships
 *
 * List pending membership requests for admin's team (v2)
 *
 * Returns pending membership requests for the team of the authenticated admin.
 * Includes user and team information.
 *
 * Authentication required - admin only
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth-server-v2'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get authenticated user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Step 2: Verify user is admin
    if (!user.is_master_admin && !user.role?.is_admin) {
      return NextResponse.json(
        { error: 'Only administrators can view pending memberships' },
        { status: 403 }
      )
    }  // FIXED: is_admin_role -> is_admin

    // Step 3: Get user's team_id
    if (!user.team_id) {
      return NextResponse.json(
        { error: 'User does not belong to a team' },
        { status: 400 }
      )
    }

    // Step 4: Query pending memberships for the team
    const supabase = await createServerClient()
    const { data: memberships, error } = await (supabase.from('team_memberships') as any)
      .select(`
        *,
        user:users(
          id,
          email
        ),
        team:teams(
          id,
          name
        )
      `)
      .eq('team_id', user.team_id)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })

    if (error) {
      console.error('[pending-memberships] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch memberships' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: memberships || [],
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[pending-memberships] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
