/**
 * Roles API Endpoint V2
 * GET /api/roles - List roles (team-scoped)
 * POST /api/roles - Create custom role
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { getTeamContext } from '@/lib/utils/team-context'
import { checkPermission } from '@/lib/utils/permissions'
import { getTeamRoles, createCustomRole } from '@/lib/utils/role-helpers'
import { z } from 'zod'

/**
 * GET /api/roles
 * List all roles for the user's team
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get team context
    const searchParams = request.nextUrl.searchParams
    const teamContext = await getTeamContext(user.user_id, {
      targetTeamId: searchParams.get('teamId') || undefined,
    })

    // 3. Check permissions (skip if master admin)
    if (!teamContext.isMasterAdmin && !teamContext.isLocalAdmin) {
      const hasPermission = await checkPermission(user.user_id, 'roles.read')
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    // 4. Get roles for team
    if (!teamContext.teamId) {
      return NextResponse.json(
        { success: false, error: 'Team ID required' },
        { status: 400 }
      )
    }

    const roles = await getTeamRoles(teamContext.teamId)

    return NextResponse.json({
      success: true,
      data: roles,
    })
  } catch (error) {
    console.error('Get roles API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// Validation schema for creating custom role
const createRoleSchema = z.object({
  roleName: z.string().min(1, 'Role name is required'),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).default([]),
})

/**
 * POST /api/roles
 * Create a custom role for the team
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get team context
    const teamContext = await getTeamContext(user.user_id)

    // 3. Check permissions (only local admin or master admin can create roles)
    if (!teamContext.isMasterAdmin && !teamContext.isLocalAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can create roles' },
        { status: 403 }
      )
    }

    // 4. Validate request body
    const body = await request.json()
    const validationResult = createRoleSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.errors[0].message,
        },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // 5. Create custom role
    if (!teamContext.teamId) {
      return NextResponse.json(
        { success: false, error: 'Team ID required' },
        { status: 400 }
      )
    }

    const role = await createCustomRole(
      teamContext.teamId,
      data.roleName,
      data.description || null,
      data.permissionIds,
      user.user_id
    )

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Failed to create role' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: role,
    })
  } catch (error) {
    console.error('Create role API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
