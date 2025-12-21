/**
 * Debug Auth Endpoint
 * Diagnoses authentication issues - REMOVE IN PRODUCTION
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    steps: [],
  }

  try {
    // Step 1: Check what cookies exist
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    const supabaseCookies = allCookies.filter(c =>
      c.name.includes('supabase') || c.name.includes('sb-')
    )

    diagnostics.steps.push({
      step: 1,
      name: 'Cookie Check',
      totalCookies: allCookies.length,
      supabaseCookieNames: supabaseCookies.map(c => c.name),
      hasAuthCookies: supabaseCookies.length > 0,
    })

    // Step 2: Create server client and check auth
    const supabase = await createServerClient()

    diagnostics.steps.push({
      step: 2,
      name: 'Server Client Created',
      success: true,
    })

    // Step 3: Get auth user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    diagnostics.steps.push({
      step: 3,
      name: 'Auth getUser()',
      hasUser: !!authUser,
      userId: authUser?.id || null,
      email: authUser?.email || null,
      error: authError?.message || null,
    })

    if (!authUser) {
      diagnostics.conclusion = 'FAILED at Step 3: No authenticated user found in session'
      return NextResponse.json(diagnostics, { status: 200 })
    }

    // Step 4: Check if user record exists in database
    // Note: users table has column "id", not "user_id"
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, team_id, role_id, email, is_master_admin')
      .eq('id', authUser.id)
      .single()

    diagnostics.steps.push({
      step: 4,
      name: 'User Record Query',
      hasUserRecord: !!userData,
      userData: userData || null,
      error: userError?.message || null,
      errorCode: userError?.code || null,
    })

    if (!userData) {
      // Step 4b: Try with admin client to bypass RLS
      const adminClient = await createAdminClient()
      const { data: adminUserData, error: adminError } = await adminClient
        .from('users')
        .select('id, team_id, role_id, email, is_master_admin')
        .eq('id', authUser.id)
        .single()

      diagnostics.steps.push({
        step: '4b',
        name: 'User Record Query (Admin)',
        hasUserRecord: !!adminUserData,
        userData: adminUserData || null,
        error: adminError?.message || null,
        errorCode: adminError?.code || null,
      })

      if (!adminUserData) {
        diagnostics.conclusion = 'FAILED: Auth user exists but no database record found. User needs to complete signup/onboarding.'
        return NextResponse.json(diagnostics, { status: 200 })
      }

      diagnostics.conclusion = 'WARNING: User record exists but RLS is blocking access. Check RLS policies.'
      return NextResponse.json(diagnostics, { status: 200 })
    }

    // Step 5: Check team assignment
    const userRecord = userData as any
    if (!userRecord.team_id) {
      diagnostics.steps.push({
        step: 5,
        name: 'Team Check',
        hasTeam: false,
        isMasterAdmin: userRecord.is_master_admin,
      })

      if (!userRecord.is_master_admin) {
        diagnostics.conclusion = 'FAILED: User has no team_id and is not master admin. User needs to complete onboarding.'
        return NextResponse.json(diagnostics, { status: 200 })
      }
    } else {
      // Step 6: Check team exists
      // Note: teams table has columns: id, name (not team_id, team_name)
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('id', userRecord.team_id)
        .single()

      diagnostics.steps.push({
        step: 5,
        name: 'Team Check',
        hasTeam: !!teamData,
        teamData: teamData || null,
        error: teamError?.message || null,
      })
    }

    diagnostics.conclusion = 'SUCCESS: Auth and user record are properly configured'
    return NextResponse.json(diagnostics, { status: 200 })

  } catch (error: any) {
    diagnostics.steps.push({
      step: 'ERROR',
      name: 'Exception',
      error: error.message,
      stack: error.stack,
    })
    diagnostics.conclusion = `EXCEPTION: ${error.message}`
    return NextResponse.json(diagnostics, { status: 500 })
  }
}
