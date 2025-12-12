const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  try {
    console.log('Disabling RLS and granting permissions...');

    const tables = ['teams', 'users'];

    for (const table of tables) {
      try {
        await supabase.rpc('exec_sql', { sql: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY` });
        console.log(`✓ RLS disabled on ${table}`);
      } catch (e) {
        console.log('Error:', e.message);
      }
    }

    const permStmts = [
      'GRANT ALL PRIVILEGES ON teams TO anon',
      'GRANT ALL PRIVILEGES ON users TO anon',
      'GRANT USAGE ON SCHEMA public TO anon',
      'GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon',
    ];

    console.log('Granting final permissions...');
    for (const stmt of permStmts) {
      try {
        await supabase.rpc('exec_sql', { sql: stmt });
        console.log('✓ OK');
      } catch (e) {
        console.log('Error:', e.message);
      }
    }

    console.log('Complete');
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
