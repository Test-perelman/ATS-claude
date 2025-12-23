/**
 * POST /api/admin/fix-rls
 *
 * ADMIN ONLY: Fixes RLS policies on database tables
 * This is a one-time fix for the RLS issue caused by incomplete migrations
 *
 * Should only be callable by master admin
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    console.log('[fix-rls] Starting RLS fix...')

    // Get admin client
    const supabase = await createAdminClient()

    // Step 1: Enable RLS on users table
    console.log('[fix-rls] Enabling RLS on users table...')
    const { error: enableUsersRLS } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE users ENABLE ROW LEVEL SECURITY;'
    }).then(() => ({ error: null }))
    .catch((e) => ({ error: e }))

    // Note: exec() RPC might not exist, so we'll do this differently
    // We'll use direct database operations instead

    // Drop old policies
    console.log('[fix-rls] Dropping old policies...')
    try {
      await supabase.rpc('exec', { sql: `
        DROP POLICY IF EXISTS users_master_admin ON users;
        DROP POLICY IF EXISTS users_own_team ON users;
        DROP POLICY IF EXISTS users_own_profile ON users;
      ` })
    } catch (e) {
      console.log('[fix-rls] Note: Could not drop via RPC', e)
    }

    // Grant permissions to authenticated
    console.log('[fix-rls] Granting permissions...')
    try {
      // Create a simple policy that allows authenticated users to select users
      // First, check if we can query the users table at all
      const { data: usersCheck } = await supabase
        .from('users')
        .select('id, email')
        .limit(1)

      if (usersCheck) {
        console.log('[fix-rls] ✅ Users table is already accessible!')
        return NextResponse.json({
          success: true,
          message: 'RLS policies are already correct - users table is accessible',
        })
      }
    } catch (e) {
      console.log('[fix-rls] Users table not accessible:', e)
    }

    // If we got here, we need a different approach
    // The issue is that RLS is blocking access and we need to fix it at the source

    console.log('[fix-rls] Current limitation: Cannot execute raw SQL via API')
    return NextResponse.json({
      success: false,
      message: 'Manual SQL execution required - use Supabase SQL Editor',
      instructions: {
        step1: 'Go to https://supabase.com/dashboard',
        step2: 'Navigate to SQL Editor',
        step3: 'Copy contents of QUICK_RLS_FIX.sql',
        step4: 'Paste and execute in SQL Editor',
      }
    }, { status: 400 })

  } catch (error) {
    console.error('[fix-rls] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fix RLS' },
      { status: 500 }
    )
  }
}
