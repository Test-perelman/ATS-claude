/**
 * Check User Permissions
 *
 * Shows what permissions the user has and if they can create candidates
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://awujhuncfghjshggkqyo.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4'

const TEST_USER_ID = '4cb40cd9-dadd-4fcf-aa2d-ccd12c8b302a'
const TEST_ROLE_ID = '0e68d69b-a808-487d-a7fd-03e107a1d5a4'

console.log('═══════════════════════════════════════════════════════════')
console.log('USER PERMISSIONS DIAGNOSIS')
console.log('═══════════════════════════════════════════════════════════\n')

async function checkPermissions() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    console.log(`Checking permissions for user: ${TEST_USER_ID}`)
    console.log(`Role ID: ${TEST_ROLE_ID}\n`)

    // Get role permissions
    const { data: rolePerms, error: permsError } = await (supabase as any)
      .from('role_permissions')
      .select(`
        id,
        permission:permissions(
          id,
          key,
          name
        )
      `)
      .eq('role_id', TEST_ROLE_ID)

    if (permsError) {
      console.error('❌ Error querying role permissions:', permsError.message)
      return
    }

    console.log(`Role has ${rolePerms?.length || 0} permissions:\n`)

    if (rolePerms && rolePerms.length > 0) {
      rolePerms.forEach((rp: any) => {
        const perm = rp.permission
        if (perm) {
          console.log(`  • ${perm.key} - ${perm.name}`)
        }
      })
    } else {
      console.log('  (no permissions assigned)')
    }

    console.log('')

    // Check specifically for candidates.create
    const hasCreatePermission = rolePerms?.some(
      (rp: any) => rp.permission?.key === 'candidates.create'
    )

    console.log('═══════════════════════════════════════════════════════════')
    console.log('ANALYSIS')
    console.log('═══════════════════════════════════════════════════════════\n')

    if (hasCreatePermission) {
      console.log('✅ User has candidates.create permission')
      console.log('   Should be able to create candidates\n')
    } else {
      console.log('❌ User does NOT have candidates.create permission')
      console.log('   This would cause a 403 error, not 500\n')
    }

    // List all available permissions in the system
    console.log('All available permissions in system:')
    const { data: allPerms } = await (supabase as any)
      .from('permissions')
      .select('key, name')
      .order('key')

    if (allPerms && allPerms.length > 0) {
      allPerms.forEach((p: any) => {
        const isGranted = rolePerms?.some((rp: any) => rp.permission?.key === p.key)
        const symbol = isGranted ? '✅' : '❌'
        console.log(`  ${symbol} ${p.key} - ${p.name}`)
      })
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

checkPermissions()
