import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://awujhuncfghjshggkqyo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4'
)

const SQL = `
DROP FUNCTION IF EXISTS is_master_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_team_id(TEXT) CASCADE;
DROP FUNCTION IF EXISTS is_admin_for_team(TEXT) CASCADE;

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

async function execute() {
  try {
    console.log('Executing RLS fix...')
    const { error } = await (supabase as any).rpc('execute_sql', { sql: SQL })

    if (error) throw error
    console.log('✅ Done')
  } catch (e: any) {
    console.error('Failed:', e.message)

    // Try direct approach - split and execute individually
    console.log('\nTrying individual statements...')
    const statements = [
      'DROP FUNCTION IF EXISTS is_master_admin(TEXT) CASCADE',
      'DROP FUNCTION IF EXISTS get_user_team_id(TEXT) CASCADE',
      'DROP FUNCTION IF EXISTS is_admin_for_team(TEXT) CASCADE',
      `CREATE OR REPLACE FUNCTION get_user_team_id(user_id TEXT) RETURNS UUID AS $$ SELECT team_id FROM users WHERE id = user_id $$ LANGUAGE sql STABLE SECURITY DEFINER`,
      `CREATE OR REPLACE FUNCTION is_master_admin(user_id TEXT) RETURNS BOOLEAN AS $$ SELECT is_master_admin FROM users WHERE id = user_id $$ LANGUAGE sql STABLE SECURITY DEFINER`,
      `CREATE OR REPLACE FUNCTION is_admin_for_team(user_id TEXT) RETURNS BOOLEAN AS $$ SELECT COALESCE((SELECT r.is_admin FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = user_id), FALSE) $$ LANGUAGE sql STABLE SECURITY DEFINER`,
    ]

    for (const stmt of statements) {
      const { error: stmtErr } = await (supabase as any).rpc('exec_sql', { sql: stmt })
      if (stmtErr) console.log('Stmt error (expected):', stmtErr.message?.substring(0, 50))
    }
  }
}

execute()
