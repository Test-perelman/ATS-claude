/**
 * Direct Constraint Fix via Supabase Database
 *
 * This script directly updates the database to fix constraint violations
 * without going through the Next.js API.
 *
 * Usage:
 * npx tsx scripts/direct_constraint_fix.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://awujhuncfghjshggkqyo.supabase.co'
// Use SERVICE ROLE KEY to bypass RLS policies for admin operations
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4'

console.log('═══════════════════════════════════════════════════════════')
console.log('DIRECT CONSTRAINT VIOLATION FIX')
console.log('═══════════════════════════════════════════════════════════\n')

async function fixConstraints() {
  try {
    console.log('Connecting to Supabase...')
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    console.log('Step 1: Counting constraint violations...\n')

    // Count violations before fix
    const { data: beforeData, error: beforeError } = await (supabase as any)
      .from('users')
      .select('id, email, is_master_admin, team_id, role_id', { count: 'exact' })
      .eq('is_master_admin', false)
      .is('team_id', null)
      .is('role_id', null)

    if (beforeError) {
      console.error('❌ Failed to count violations:', beforeError.message)
      return false
    }

    const violationCount = beforeData?.length || 0
    console.log(`Found ${violationCount} users with constraint violations:`)
    if (beforeData && beforeData.length > 0) {
      beforeData.forEach((user: any) => {
        console.log(`  - ${user.email} (ID: ${user.id})`)
      })
    }
    console.log('')

    if (violationCount === 0) {
      console.log('✅ No violations found - database is already clean!')
      return true
    }

    console.log('Step 2: Applying fix...\n')

    // Apply fix: Set all violating users to be master admins
    const { error: updateError, data: updateData } = await (supabase as any)
      .from('users')
      .update({ is_master_admin: true })
      .eq('is_master_admin', false)
      .is('team_id', null)
      .is('role_id', null)
      .select()

    if (updateError) {
      console.error('❌ Failed to apply fix:', updateError.message)
      return false
    }

    console.log(`✅ Updated ${violationCount} users to master admin status`)
    if (updateData && updateData.length > 0) {
      updateData.forEach((user: any) => {
        console.log(`  - ${user.email} is now master admin`)
      })
    }
    console.log('')

    console.log('Step 3: Verifying fix...\n')

    // Verify no violations remain
    const { data: afterData, error: afterError } = await (supabase as any)
      .from('users')
      .select('id, email, is_master_admin, team_id, role_id')
      .eq('is_master_admin', false)
      .is('team_id', null)
      .is('role_id', null)

    if (afterError) {
      console.error('❌ Failed to verify fix:', afterError.message)
      return false
    }

    const remainingCount = afterData?.length || 0

    if (remainingCount === 0) {
      console.log('✅ Verification successful - all violations fixed!')
      console.log('')
      console.log('═══════════════════════════════════════════════════════════')
      console.log('SUMMARY')
      console.log('═══════════════════════════════════════════════════════════')
      console.log(`Fixed: ${violationCount} users`)
      console.log(`Remaining violations: 0`)
      console.log(`Status: COMPLETE ✅`)
      console.log('')
      console.log('You can now:')
      console.log('1. Log in to https://ats-claude.vercel.app')
      console.log('2. Create candidates without errors')
      console.log('3. View candidates in the list')
      console.log('')
      return true
    } else {
      console.log(`⚠️ Warning: ${remainingCount} violations still exist`)
      if (afterData && afterData.length > 0) {
        afterData.forEach((user: any) => {
          console.log(`  - ${user.email} (still has constraint violation)`)
        })
      }
      return false
    }
  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

fixConstraints().then((success) => {
  process.exit(success ? 0 : 1)
})
