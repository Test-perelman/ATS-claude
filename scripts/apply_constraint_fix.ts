/**
 * Apply Constraint Violation Fix
 *
 * This script calls the /api/admin/fix-constraints endpoint to fix users
 * with constraint violations in the database.
 *
 * Usage:
 * npx tsx scripts/apply_constraint_fix.ts [production_url] [access_token]
 *
 * Example for production:
 * npx tsx scripts/apply_constraint_fix.ts https://ats-claude.vercel.app "eyJhbGc..."
 */

import fetch from 'node-fetch'

const args = process.argv.slice(2)
const PRODUCTION_URL = args[0] || 'https://ats-claude.vercel.app'
const ACCESS_TOKEN = args[1] || process.env.SUPABASE_ACCESS_TOKEN || ''

console.log('═══════════════════════════════════════════════════════════')
console.log('CONSTRAINT VIOLATION FIX')
console.log('═══════════════════════════════════════════════════════════\n')

console.log(`Target URL: ${PRODUCTION_URL}`)
console.log(`Using token: ${ACCESS_TOKEN ? '(provided)' : '(missing - will use cookies)'}`)
console.log('')

if (!ACCESS_TOKEN) {
  console.log('⚠️  No access token provided. This will only work if called from the same origin.')
  console.log('To fix production, provide your access token:\n')
  console.log(`  npx tsx scripts/apply_constraint_fix.ts ${PRODUCTION_URL} "YOUR_ACCESS_TOKEN"\n`)
}

async function applyFix() {
  try {
    console.log('Sending fix request to /api/admin/fix-constraints...\n')

    const headers: any = {
      'Content-Type': 'application/json',
    }

    if (ACCESS_TOKEN) {
      headers['Authorization'] = `Bearer ${ACCESS_TOKEN}`
    }

    const response = await fetch(`${PRODUCTION_URL}/api/admin/fix-constraints`, {
      method: 'POST',
      headers,
    }) as any

    const data = await response.json()

    if (response.status === 200 && data.success) {
      console.log('✅ SUCCESS!\n')
      console.log(`Fixed: ${data.fixed} users`)
      console.log(`Remaining violations: ${data.violations_after}`)
      console.log(`Status: ${data.status}\n`)

      if (data.violations_after === 0) {
        console.log('🎉 All constraint violations have been fixed!')
        console.log('You can now create candidates without errors.\n')
      }

      return true
    } else if (response.status === 403) {
      console.log('❌ ACCESS DENIED')
      console.log('Only master admins can run this fix.')
      console.log('Make sure you are logged in as a master admin and the token is valid.\n')
      return false
    } else if (response.status === 401) {
      console.log('❌ UNAUTHORIZED')
      console.log('Your authentication failed. Check your access token.\n')
      console.log(`Response: ${JSON.stringify(data)}\n`)
      return false
    } else {
      console.log(`❌ FAILED (Status ${response.status})`)
      console.log(`Error: ${data.error}\n`)
      console.log(`Full response: ${JSON.stringify(data, null, 2)}\n`)
      return false
    }
  } catch (error: any) {
    console.log('❌ ERROR')
    console.log(`Failed to apply fix: ${error.message}\n`)
    console.log('Make sure:')
    console.log('1. The URL is correct')
    console.log('2. The server is running')
    console.log('3. You have a valid access token\n')
    return false
  }
}

applyFix().then((success) => {
  process.exit(success ? 0 : 1)
})
