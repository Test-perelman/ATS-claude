/**
 * Auth User API Endpoint
 * POST /api/auth/user - Fetch user record by userId (admin route)
 * Uses service role key to bypass RLS
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS
    const supabase = await createAdminClient()

    // Note: users table uses id; roles/teams tables use id/name, not role_id/role_name etc
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
      .eq('id', userId)
      .single()

    // If user row doesn't exist, return success with null data
    if (userError) {
      if (userError.code === 'PGRST116') {
        // Not found - this is ok, user just hasn't been provisioned yet
        return NextResponse.json(
          { success: true, data: null },
          { status: 200 }
        )
      }
      console.error('Error fetching user:', userError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user data' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data: userData },
      { status: 200 }
    )
  } catch (error) {
    console.error('Auth user API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
