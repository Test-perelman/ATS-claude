/**
 * Update Last Login API Endpoint
 * POST /api/auth/update-last-login
 * Updates the last_login timestamp for a user
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

    const supabase = await createAdminClient()

    await (supabase.from('users') as any)
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', userId)

    return NextResponse.json(
      { success: true },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update last login API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
