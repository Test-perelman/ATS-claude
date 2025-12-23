/**
 * Check User State in Database
 *
 * Shows the actual state of the test user and what's causing the 500 error
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://awujhuncfghjshggkqyo.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4'

const TEST_USER_ID = '4cb40cd9-dadd-4fcf-aa2d-ccd12c8b302a'

console.log('═══════════════════════════════════════════════════════════')
console.log('USER STATE DIAGNOSIS')
console.log('═══════════════════════════════════════════════════════════\n')

async function checkUser() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    console.log(`Checking user: ${TEST_USER_ID}\n`)

    // Get user data
    const { data: user, error } = await (supabase as any)
      .from('users')
      .select('*')
      .eq('id', TEST_USER_ID)
      .single()

    if (error) {
      console.error('❌ Error querying user:', error.message)
      return
    }

    if (!user) {
      console.log('❌ User not found in public.users table')
      console.log('   The user exists in auth.users but not in public.users')
      console.log('   This is why candidate creation fails!\n')
      return
    }

    console.log('User Details:')
    console.log(`  ID: ${user.id}`)
    console.log(`  Email: ${user.email}`)
    console.log(`  is_master_admin: ${user.is_master_admin}`)
    console.log(`  team_id: ${user.team_id}`)
    console.log(`  role_id: ${user.role_id}`)
    console.log('')

    // Check the constraint logic
    const hasViolation =
      user.is_master_admin === false &&
      user.team_id === null &&
      user.role_id === null

    console.log('Constraint Analysis:')
    console.log(`  Valid state (is_master_admin=true, team_id=NULL, role_id=NULL)? ${user.is_master_admin === true && user.team_id === null && user.role_id === null ? 'YES ✅' : 'NO ❌'}`)
    console.log(`  Valid state (is_master_admin=false, team_id!=NULL, role_id!=NULL)? ${user.is_master_admin === false && user.team_id !== null && user.role_id !== null ? 'YES ✅' : 'NO ❌'}`)
    console.log(`  Has constraint violation? ${hasViolation ? 'YES ❌' : 'NO ✅'}`)
    console.log('')

    if (hasViolation) {
      console.log('⚠️  USER HAS CONSTRAINT VIOLATION')
      console.log('   Fix: Update user to be master admin')
      console.log('   npx tsx scripts/fix_single_user.ts\n')
      return
    }

    // User doesn't have constraint violation, so why is candidate creation failing?
    console.log('User doesn\'t have constraint violation...')
    console.log('Looking for other issues...\n')

    // Check if user has a team
    if (user.team_id) {
      console.log(`User has team_id: ${user.team_id}`)

      // Check if team exists
      const { data: team, error: teamError } = await (supabase as any)
        .from('teams')
        .select('id, name')
        .eq('id', user.team_id)
        .single()

      if (teamError) {
        console.log(`❌ Team query error: ${teamError.message}`)
        return
      }

      if (team) {
        console.log(`✅ Team exists: ${team.name}`)
      } else {
        console.log('❌ Team does not exist!')
      }
    } else {
      console.log('User has no team (team_id is NULL)')
      console.log('For non-master admins, this would be an issue')
    }

    console.log('')
    if (user.role_id) {
      console.log(`User has role_id: ${user.role_id}`)

      // Check if role exists
      const { data: role, error: roleError } = await (supabase as any)
        .from('roles')
        .select('id, name')
        .eq('id', user.role_id)
        .single()

      if (roleError) {
        console.log(`❌ Role query error: ${roleError.message}`)
        return
      }

      if (role) {
        console.log(`✅ Role exists: ${role.name}`)
      } else {
        console.log('❌ Role does not exist!')
      }
    } else {
      console.log('User has no role (role_id is NULL)')
    }

    console.log('')
    console.log('═══════════════════════════════════════════════════════════')
    console.log('DIAGNOSIS')
    console.log('═══════════════════════════════════════════════════════════')
    console.log('')

    if (user.is_master_admin) {
      console.log('✅ User is master admin')
      console.log('   Should be able to create candidates')
      console.log('   If getting 500 error, check API logs\n')
    } else if (user.team_id && user.role_id) {
      console.log('✅ User is team member with role')
      console.log('   Check permissions for candidates.create\n')
    } else {
      console.log('❌ User is in invalid state')
      console.log('   Fix required!\n')
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

checkUser()
