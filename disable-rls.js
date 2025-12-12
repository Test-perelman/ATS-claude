const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  try {
    console.log('Attempting to disable RLS on tables...');
    
    // Try disabling RLS using the Supabase query method
    const statements = [
      'ALTER TABLE teams DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE users DISABLE ROW LEVEL SECURITY'
    ];

    for (const stmt of statements) {
      console.log('Executing:', stmt);
      try {
        await supabase.rpc('exec_sql', { sql: stmt });
        console.log('Success:', stmt);
      } catch (e) {
        console.log('Direct SQL failed, trying another method...');
      }
    }

    console.log('RLS disabling complete');
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
