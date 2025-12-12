const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  try {
    console.log('Setting up completely open RLS policies...');
    
    const statements = [
      // Drop existing policies
      'DROP POLICY IF EXISTS teams_insert_policy ON teams',
      'DROP POLICY IF EXISTS teams_select_policy ON teams',
      'DROP POLICY IF EXISTS users_insert_policy ON users',
      'DROP POLICY IF EXISTS users_select_policy ON users',
      
      // Create open policies for testing
      'CREATE POLICY teams_open_insert ON teams FOR INSERT WITH CHECK (true)',
      'CREATE POLICY teams_open_select ON teams FOR SELECT USING (true)',
      'CREATE POLICY users_open_insert ON users FOR INSERT WITH CHECK (true)',
      'CREATE POLICY users_open_select ON users FOR SELECT USING (true)',
    ];

    for (const stmt of statements) {
      console.log('Executing:', stmt.substring(0, 50) + '...');
      try {
        await supabase.rpc('exec_sql', { sql: stmt });
        console.log('✓ Success');
      } catch (e) {
        console.log('✗ Failed:', e.message);
      }
    }

    console.log('Open RLS policies created');
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
