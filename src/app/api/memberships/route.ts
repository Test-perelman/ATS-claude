/**
 * GET /api/memberships
 *
 * List user's memberships (v2)
 *
 * Returns all memberships for current user:
 * - Pending memberships (awaiting approval)
 * - Approved memberships (active)
 * - Rejected memberships (history)
 *
 * Authentication required
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

    // Step 2: Query user's memberships
    const supabase = await createServerClient()
    const { data: memberships, error } = await (supabase.from('team_memberships') as any)
      .select(`
        *,
        team:teams(
          id,
          name
        )
      `)
      .eq('user_id', user.user_id)
      .order('requested_at', { ascending: false })

    if (error) {
      console.error('[memberships] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch memberships' },
        { status: 500 }
      )
    }

    // Step 3: Group memberships by status
    const grouped = {
      pending: [] as any[],
      approved: [] as any[],
      rejected: [] as any[],
    }

    (memberships || []).forEach((m: any) => {
      grouped[m.status as keyof typeof grouped].push(m)
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          pending: grouped.pending,
          approved: grouped.approved,
          rejected: grouped.rejected,
          total: memberships?.length || 0,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[memberships] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
