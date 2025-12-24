/**
 * Apply RLS Recursion Fix
 *
 * Applies the SQL migration to fix infinite recursion in RLS policies
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://awujhuncfghjshggkqyo.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4'

const SQL = `
-- Fix RLS Infinite Recursion
DROP FUNCTION IF EXISTS is_master_admin(TEXT);
DROP FUNCTION IF EXISTS get_user_team_id(TEXT);
DROP FUNCTION IF EXISTS is_admin_for_team(TEXT);

CREATE OR REPLACE FUNCTION get_user_team_id(user_id TEXT)
RETURNS UUID AS $$
  SELECT team_id FROM users WHERE id = user_id
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_master_admin(user_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT is_master_admin FROM users WHERE id = user_id
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin_for_team(user_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT COALESCE((
    SELECT r.is_admin
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = user_id
  ), FALSE)
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_team_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_master_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_for_team(TEXT) TO authenticated;
`

console.log('═══════════════════════════════════════════════════════════')
console.log('APPLY RLS RECURSION FIX')
console.log('═══════════════════════════════════════════════════════════\n')

async function applyFix() {
  try {
    console.log('Connecting to Supabase with service role...')
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    console.log('Executing SQL migration...\n')

    // Use the PostgreSQL RPC to execute raw SQL
    const { data, error } = await (supabase as any)
      .rpc('exec_sql', { sql: SQL })

    if (error) {
      // The rpc might not exist, try a different approach
      console.log('RPC method not available, using direct query...')

      // Split SQL into individual statements and execute
      const statements = SQL.split(';').filter(s => s.trim())

      for (const statement of statements) {
        if (!statement.trim()) continue

        console.log('Executing:', statement.substring(0, 80) + '...')
        const { error: stmtError } = await (supabase as any).rpc('execute_sql', {
          sql: statement.trim(),
        }).catch((e: any) => ({ error: e }))

        if (stmtError) {
          console.log('(function may not exist, continuing...)')
        }
      }

      console.log('\n⚠️  Could not execute SQL directly via RPC.')
      console.log('Manual fix required:')
      console.log('\n1. Go to Supabase SQL Editor')
      console.log('2. Run this SQL:\n')
      console.log(SQL)
      return false
    }

    console.log('✅ RLS Recursion fix applied successfully!\n')

    // Test that queries now work
    console.log('Testing queries...')
    const { data: users, error: queryError } = await (supabase as any)
      .from('users')
      .select('id, is_master_admin, team_id')
      .limit(1)

    if (queryError) {
      console.error('❌ Query still fails:', queryError.message)
      return false
    }

    console.log('✅ Users table queries now working!')
    console.log(`   Found ${users?.length || 0} users\n`)

    return true

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.log('\nPlease manually apply the fix in Supabase SQL Editor:')
    console.log(SQL)
    return false
  }
}

applyFix().then((success) => {
  process.exit(success ? 0 : 1)
})
