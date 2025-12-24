/**
 * Auth Session API Endpoint
 * GET /api/auth/session - Get current user session with permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth-server'
import { getRolePermissions } from '@/lib/utils/permissions'

/**
 * GET /api/auth/session
 * Get current authenticated user with role and permissions
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API /session] ========== AUTHENTICATION CHECK ==========')

    // Get user from cookies (Supabase session)
    console.log('[API /session] Reading user from cookies...')
    const user = await getCurrentUser()
    console.log('[API /session] getCurrentUser() result:', user ? `User ${user.user_id} (${user.email})` : 'NULL')

    if (!user) {
      console.log('[API /session] ❌ No authenticated user')
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      )
    }

    console.log('[API /session] ✅ User authenticated:', user.user_id)

    // Get user's role name and permissions
    const roleName = (user.role as any)?.role_name || null
    const isMasterAdmin = user.is_master_admin === true
    const isLocalAdmin = roleName === 'Local Admin'

    // Fetch user's permissions
    let userPermissions: string[] = []
    if (user.role_id) {
      userPermissions = await getRolePermissions(user.role_id)
    }

    return NextResponse.json({
      success: true,
      data: {
        user,
        isMasterAdmin,
        isLocalAdmin,
        userRole: roleName,
        userPermissions,
        teamId: user.team_id || null,
        teamName: (user.team as any)?.team_name || null,
      },
    })
  } catch (error) {
    console.error('[API /session] ❌ Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
