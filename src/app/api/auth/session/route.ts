/**
 * Auth Session API Endpoint
 * GET /api/auth/session - Get current user session with permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createUserClient } from '@/lib/supabase/user-server'
import { getRolePermissions } from '@/lib/utils/permissions'

/**
 * GET /api/auth/session
 * Get current authenticated user with role and permissions
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API /session] ========== AUTHENTICATION CHECK ==========')

    // Create properly scoped server client with cookies
    console.log('[API /session] Creating server client...')
    const supabase = await createUserClient()

    // Get user from session (via cookies)
    console.log('[API /session] Reading user from cookies...')
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('[API /session] Auth error:', authError.message)
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      )
    }

    if (!authUser) {
      console.log('[API /session] ❌ No authenticated user in session')
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      )
    }

    console.log('[API /session] ✅ Auth user found:', authUser.id, 'email:', authUser.email)

    // Query user record from database
    const { data: userData, error: queryError } = await supabase
      .from('users')
      .select(`
        id,
        team_id,
        role_id,
        email,
        is_master_admin,
        created_at,
        updated_at,
        role:roles (
          id,
          name,
          is_admin
        ),
        team:teams (
          id,
          name
        )
      `)
      .eq('id', authUser.id)
      .single()

    // Only PGRST116 (no rows) is acceptable
    if (queryError && queryError.code !== 'PGRST116') {
      console.error('[API /session] Query error:', queryError.message)
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      )
    }

    if (!userData) {
      console.warn('[API /session] ⚠️ No user record found (incomplete signup)')
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      )
    }

    // Build complete user object
    const user = {
      user_id: (userData as any).id,
      team_id: (userData as any).team_id,
      role_id: (userData as any).role_id,
      email: (userData as any).email,
      username: null,
      first_name: null,
      last_name: null,
      is_master_admin: (userData as any).is_master_admin,
      status: 'active' as const,
      role: (userData as any).role
        ? {
            role_id: (userData as any).role.id,
            role_name: (userData as any).role.name,
            is_admin_role: (userData as any).role.is_admin,
          }
        : null,
      team: (userData as any).team
        ? {
            team_id: (userData as any).team.id,
            team_name: (userData as any).team.name,
            company_name: (userData as any).team.name,
          }
        : null,
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
