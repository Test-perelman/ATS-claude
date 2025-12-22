/**
 * POST /api/admin/approve-membership
 *
 * Admin approves pending membership (v2 - ADMIN ONLY)
 *
 * Local admin or master admin approves a pending user.
 * This endpoint:
 * 1. Validates current user is admin of the team
 * 2. Updates membership: status='approved', approved_at, approved_by
 * 3. Assigns role to user
 * 4. User gains full data access
 *
 * Expected request body:
 * {
 *   "membershipId": "membership-uuid",
 *   "roleId": "role-to-assign-uuid",
 *   "message": "Welcome!"  // optional
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth-server-v2'
import { approveMembership } from '@/lib/supabase/auth-server-v2'

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
        { error: 'Only administrators can approve memberships' },
        { status: 403 }
      )
    }

    // Step 3: Parse request
    const body = await request.json()
    const { membershipId, roleId, message } = body

    if (!membershipId || !roleId) {
      return NextResponse.json(
        { error: 'Missing required fields: membershipId, roleId' },
        { status: 400 }
      )
    }

    // Step 4: Approve membership
    console.log('[approve-membership] Admin', user.user_id, 'approving membership:', membershipId)
    const result = await approveMembership({
      adminUserId: user.user_id,
      membershipId,
      roleId,
      message,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to approve membership' },
        { status: 500 }
      )
    }

    // Step 5: Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Membership approved. User can now access team data.',
        data: {
          membership: result.data?.membership,
          user: result.data?.user,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[approve-membership] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
