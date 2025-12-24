/**
 * Execute RLS Fix via Supabase REST API
 *
 * Uses the Supabase REST API to execute SQL directly
 */

import fetch from 'node-fetch'

const SUPABASE_URL = 'https://awujhuncfghjshggkqyo.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4'

const FIX_SQL = `
DROP FUNCTION IF EXISTS is_master_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_team_id(TEXT) CASCADE;
DROP FUNCTION IF EXISTS is_admin_for_team(TEXT) CASCADE;
DROP POLICY IF EXISTS users_master_admin ON users;
DROP POLICY IF EXISTS users_own_team ON users;
DROP POLICY IF EXISTS users_own_profile ON users;

CREATE FUNCTION get_user_team_id(user_id TEXT) RETURNS UUID AS $$ SELECT team_id FROM users WHERE id = user_id $$ LANGUAGE sql STABLE SECURITY DEFINER;
CREATE FUNCTION is_master_admin(user_id TEXT) RETURNS BOOLEAN AS $$ SELECT is_master_admin FROM users WHERE id = user_id $$ LANGUAGE sql STABLE SECURITY DEFINER;
CREATE FUNCTION is_admin_for_team(user_id TEXT) RETURNS BOOLEAN AS $$ SELECT COALESCE((SELECT r.is_admin FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = user_id), FALSE) $$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE POLICY users_master_admin ON users USING (is_master_admin(auth.user_id())) WITH CHECK (is_master_admin(auth.user_id()));
CREATE POLICY users_own_team ON users USING (team_id = get_user_team_id(auth.user_id())) WITH CHECK (FALSE);
CREATE POLICY users_own_profile ON users USING (id = auth.user_id()) WITH CHECK (id = auth.user_id());

GRANT EXECUTE ON FUNCTION get_user_team_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_master_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_for_team(TEXT) TO authenticated;
`

async function execute() {
  try {
    console.log('Executing RLS fix via REST API...')

    // Try calling a function on the database directly
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: FIX_SQL }),
    }) as any

    const data = await response.json()

    if (response.status === 200) {
      console.log('✅ Success')
      console.log(data)
    } else {
      console.log('Response:', response.status)
      console.log(data)
    }
  } catch (e: any) {
    console.error('Error:', e.message)
  }
}

execute()
