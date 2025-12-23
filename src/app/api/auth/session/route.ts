/**
 * Auth Session API Endpoint
 * GET /api/auth/session - Get current user session with permissions
 *
 * Supports two authentication methods:
 * 1. Next.js cookies (from browser)
 * 2. Authorization: Bearer {token} header (from scripts/API calls)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth-server'
import { getRolePermissions } from '@/lib/utils/permissions'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/auth/session
 * Get current authenticated user with role and permissions
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API /session] Checking authentication...')

    // Check for Authorization header (Bearer token)
    const authHeader = request.headers.get('authorization')
    let user = null

    if (authHeader?.startsWith('Bearer ')) {
      // Extract token from Authorization header
      const token = authHeader.substring(7)
      console.log('[API /session] Using Authorization header token')

      try {
        // Create a client with the token for server-side auth
        const supabase = await createServerClient()

        // Set the auth token on the client
        const { data, error } = await supabase.auth.getUser(token)

        if (error) {
          console.error('[API /session] Token validation error:', error.message)
        } else if (data.user) {
          console.log('[API /session] Auth user from token:', data.user.id)

          // Now fetch the public user record
          const userIdString = data.user.id.toString()
          const { data: userData, error: userError } = await supabase
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
            .eq('id', userIdString)
            .single()

          if (userError && userError.code !== 'PGRST116') {
            console.error('[API /session] User query error:', userError.message)
          }

          if (userData) {
            console.log('[API /session] User found:', (userData as any).id)
            user = {
              user_id: (userData as any).id,
              team_id: (userData as any).team_id,
              role_id: (userData as any).role_id,
              email: (userData as any).email,
              username: null,
              first_name: null,
              last_name: null,
              is_master_admin: (userData as any).is_master_admin,
              role: (userData as any).role ? {
                role_id: (userData as any).role.id,
                role_name: (userData as any).role.name,
                is_admin_role: (userData as any).role.is_admin,
              } : null,
              team: (userData as any).team ? {
                team_id: (userData as any).team.id,
                team_name: (userData as any).team.name,
                company_name: (userData as any).team.name,
              } : null,
            }
          } else if (data.user) {
            // Fallback: return user from token if not in public.users
            console.warn('[API /session] User not in public.users, using fallback')
            user = {
              user_id: data.user.id.toString(),
              email: data.user.email || '',
              team_id: null,
              role_id: null,
              is_master_admin: false,
              username: null,
              first_name: null,
              last_name: null,
              role: null,
              team: null,
            }
          }
        }
      } catch (tokenError) {
        console.error('[API /session] Token processing error:', tokenError)
      }
    }

    // If no token-based auth, use cookie-based auth
    if (!user) {
      console.log('[API /session] Trying cookie-based authentication')
      user = await getCurrentUser()
    }

    if (!user) {
      console.log('[API /session] No authenticated user')
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      )
    }

    console.log('[API /session] User authenticated:', user.user_id)

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
    console.error('Get session API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
