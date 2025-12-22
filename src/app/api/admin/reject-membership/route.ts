/**
 * POST /api/admin/reject-membership
 *
 * Admin rejects pending membership (v2 - ADMIN ONLY)
 *
 * Local admin or master admin rejects a pending user.
 * This endpoint:
 * 1. Validates current user is admin of the team
 * 2. Updates membership: status='rejected', rejected_at, rejection_reason
 * 3. User cannot access team data
 * 4. User can request access again later
 *
 * Expected request body:
 * {
 *   "membershipId": "membership-uuid",
 *   "reason": "Does not meet requirements"
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth-server-v2'
import { rejectMembership } from '@/lib/supabase/auth-server-v2'

export async function POST(request: NextRequest) {
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
    if (!user.is_master_admin && !user.role?.is_admin_role) {
      return NextResponse.json(
        { error: 'Only administrators can reject memberships' },
        { status: 403 }
      )
    }

    // Step 3: Parse request
    const body = await request.json()
    const { membershipId, reason } = body

    if (!membershipId || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: membershipId, reason' },
        { status: 400 }
      )
    }

    // Step 4: Reject membership
    console.log('[reject-membership] Admin', user.user_id, 'rejecting membership:', membershipId)
    const result = await rejectMembership({
      adminUserId: user.user_id,
      membershipId,
      reason,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to reject membership' },
        { status: 500 }
      )
    }

    // Step 5: Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Membership rejected. User has been notified.',
        data: {
          membership: result.data?.membership,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[reject-membership] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
