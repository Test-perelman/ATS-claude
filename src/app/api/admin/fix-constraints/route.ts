/**
 * ADMIN API: Fix Constraint Violations
 *
 * This endpoint applies the critical fix for users with constraint violations:
 * - Users with is_master_admin=false, team_id=NULL, role_id=NULL
 *
 * SECURITY: Master admin only
 *
 * Usage:
 * curl -X POST http://localhost:3000/api/admin/fix-constraints \
 *   -H "Authorization: Bearer YOUR_TOKEN"
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { getTeamContext } from '@/lib/utils/team-context'

export async function POST(request: NextRequest) {
  try {
    console.log('[POST /admin/fix-constraints] Starting constraint violation fix...')

    // 1. Authenticate as master admin
    let user = await getCurrentUser()

    if (!user) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        console.log('[POST /admin/fix-constraints] Checking token authentication...')
        try {
          const sessionResponse = await fetch(`${request.nextUrl.origin}/api/auth/session`, {
            method: 'GET',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
          })

          const sessionData = await sessionResponse.json()
          if (sessionData.data?.user) {
            user = sessionData.data.user
            console.log('[POST /admin/fix-constraints] User authenticated via token:', user.user_id)
          }
        } catch (err) {
          console.error('[POST /admin/fix-constraints] Token session check failed:', err)
        }
      }
    }

    if (!user) {
      console.log('[POST /admin/fix-constraints] No user authenticated')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Verify master admin status
    let isMasterAdmin = user.is_master_admin === true

    // If not master admin from session, double-check in database
    if (!isMasterAdmin) {
      console.log('[POST /admin/fix-constraints] Checking master admin status in database...')
      const supabase = await createServerClient()
      const { data: dbUser } = await supabase
        .from('users')
        .select('is_master_admin')
        .eq('id', user.user_id)
        .single()

      isMasterAdmin = (dbUser as any)?.is_master_admin === true
    }

    if (!isMasterAdmin) {
      console.log('[POST /admin/fix-constraints] User is not master admin:', user.user_id)
      return NextResponse.json(
        { success: false, error: 'Access denied: Master admin required' },
        { status: 403 }
      )
    }

    console.log('[POST /admin/fix-constraints] ✅ Master admin verified')

    // 3. Apply the fix using raw SQL
    const supabase = await createServerClient()

    console.log('[POST /admin/fix-constraints] Executing fix SQL...')

    // First, count how many violations exist
    const { data: violatingUsers, error: countError } = await supabase
      .rpc('count', {
        table_name: 'users',
        // Filter: is_master_admin=false AND team_id IS NULL AND role_id IS NULL
      })

    // Actually, let's use a direct SQL approach via a stored function
    // For now, we'll use Supabase's PostgreSQL JSON-RPC capability

    // Get raw count first
    const { data: beforeData, error: beforeError } = await (supabase as any)
      .from('users')
      .select('id')
      .eq('is_master_admin', false)
      .is('team_id', null)
      .is('role_id', null)

    if (beforeError) {
      console.error('[POST /admin/fix-constraints] Count query error:', beforeError)
      return NextResponse.json(
        { success: false, error: 'Failed to count violations: ' + beforeError.message },
        { status: 500 }
      )
    }

    const violationCount = beforeData?.length || 0
    console.log(`[POST /admin/fix-constraints] Found ${violationCount} users with constraint violations`)

    if (violationCount === 0) {
      console.log('[POST /admin/fix-constraints] ✅ No violations found - database is clean')
      return NextResponse.json({
        success: true,
        message: 'No constraint violations found',
        fixed: 0,
        violations_before: 0,
      })
    }

    // Apply the fix - update all violating users to be master admins
    const { error: updateError } = await (supabase as any)
      .from('users')
      .update({ is_master_admin: true })
      .eq('is_master_admin', false)
      .is('team_id', null)
      .is('role_id', null)

    if (updateError) {
      console.error('[POST /admin/fix-constraints] Update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to apply fix: ' + updateError.message },
        { status: 500 }
      )
    }

    console.log(`[POST /admin/fix-constraints] ✅ Updated ${violationCount} users to master admin status`)

    // Verify the fix
    const { data: afterData, error: afterError } = await (supabase as any)
      .from('users')
      .select('id')
      .eq('is_master_admin', false)
      .is('team_id', null)
      .is('role_id', null)

    if (afterError) {
      console.error('[POST /admin/fix-constraints] Verification query error:', afterError)
      return NextResponse.json(
        { success: false, error: 'Fix applied but verification failed: ' + afterError.message },
        { status: 500 }
      )
    }

    const remainingViolations = afterData?.length || 0

    console.log(
      `[POST /admin/fix-constraints] ✅ FIX COMPLETE - Fixed: ${violationCount}, Remaining violations: ${remainingViolations}`
    )

    return NextResponse.json({
      success: true,
      message: 'Constraint violations fixed successfully',
      fixed: violationCount,
      violations_before: violationCount,
      violations_after: remainingViolations,
      status: remainingViolations === 0 ? 'COMPLETE' : 'PARTIAL',
    })
  } catch (error) {
    console.error('[POST /admin/fix-constraints] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred: ' + String(error) },
      { status: 500 }
    )
  }
}
