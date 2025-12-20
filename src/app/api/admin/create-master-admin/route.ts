/**
 * Create Master Admin API Route
 * POST /api/admin/create-master-admin
 *
 * ⚠️ SECURITY: Only for initial setup
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const SETUP_TOKEN = process.env.ADMIN_SETUP_TOKEN

export async function POST(request: NextRequest) {
  try {
    // Validate env var is configured
    if (!SETUP_TOKEN || SETUP_TOKEN === 'change-me-in-production') {
      console.error('[SECURITY] ADMIN_SETUP_TOKEN not properly configured! Master admin creation disabled.')
      return NextResponse.json(
        { error: 'Server not properly configured for master admin creation' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { email, password, firstName, lastName, setupToken } = body

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, firstName, lastName' },
        { status: 400 }
      )
    }

    // Always validate the token
    if (!setupToken || setupToken !== SETUP_TOKEN) {
      return NextResponse.json(
        { error: 'Invalid or missing setup token' },
        { status: 401 }
      )
    }

    console.log('[POST /admin/create-master-admin] Creating master admin:', email)

    const supabase = await createAdminClient()

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create auth user' },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    const { data: userData, error: userError } = await (supabase.from('users') as any)
      .insert({
        user_id: userId,
        email,
        username: email.split('@')[0],
        first_name: firstName,
        last_name: lastName,
        is_master_admin: true,
        team_id: null,
        role_id: null,
        status: 'active',
      })
      .select()
      .single()

    if (userError || !userData) {
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: userError?.message || 'Failed to create user record' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Master admin created successfully',
      data: {
        user_id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
      },
    })
  } catch (error) {
    console.error('[POST /admin/create-master-admin] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
