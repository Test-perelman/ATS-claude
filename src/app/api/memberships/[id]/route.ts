/**
 * GET /api/memberships/[id]
 *
 * Get single membership details (v2)
 *
 * Returns details for a specific membership.
 * User can only see their own memberships.
 * Admins can see memberships for their team.
 *
 * Authentication required
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth-server-v2'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Step 1: Get authenticated user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Step 2: Query membership
    const supabase = await createServerClient()
    const { data: membership, error } = await (supabase.from('team_memberships') as any)
      .select(`
        *,
        team:teams(id, name),
        requested_role:roles(id, name)
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('[membership-detail] Query error:', error)
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      )
    }

    // Step 3: Verify access
    // User can see their own membership
    // Admin can see memberships in their team
    const canAccess =
      (membership as any).user_id === user.user_id ||
      (user.is_master_admin) ||
      ((membership as any).team_id === user.team_id && user.role?.is_admin_role)

    if (!canAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: membership,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[membership-detail] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
