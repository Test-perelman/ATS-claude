const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  try {
    // Drop old policies first
    const dropStatements = [
      'DROP POLICY IF EXISTS teams_insert_policy ON teams',
      'DROP POLICY IF EXISTS users_insert_policy ON users'
    ];

    for (const stmt of dropStatements) {
      await supabase.rpc('exec_sql', { sql: stmt });
    }

    // Create new policies
    const policies = [
      `CREATE POLICY teams_insert_policy ON teams FOR INSERT WITH CHECK (public._rls_is_master_admin() OR auth.uid() IS NOT NULL)`,
      `CREATE POLICY users_insert_policy ON users FOR INSERT WITH CHECK (public._rls_is_master_admin() OR team_id::text = public._rls_current_user_team_id() OR user_id::text = public._rls_current_user_id())`
    ];

    for (const policy of policies) {
      await supabase.rpc('exec_sql', { sql: policy });
    }

    console.log('Policies updated');
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
