const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  try {
    console.log('Attempting to grant permissions...');
    
    const statements = [
      // Grant all permissions to anon role on teams
      'GRANT SELECT, INSERT, UPDATE, DELETE ON teams TO anon',
      'GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon',
      'GRANT SELECT, INSERT, UPDATE, DELETE ON roles TO anon',
      'GRANT SELECT, INSERT, UPDATE, DELETE ON teams_usage TO anon',
      'GRANT SELECT ON role_permissions TO anon',
      'GRANT SELECT ON role_templates TO anon',
      'GRANT SELECT ON permissions TO anon',
      'GRANT SELECT ON template_permissions TO anon',
      'GRANT USAGE ON SCHEMA public TO anon',
      'GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon',
    ];

    for (const stmt of statements) {
      console.log('Executing:', stmt);
      try {
        await supabase.rpc('exec_sql', { sql: stmt });
        console.log('Success:', stmt);
      } catch (e) {
        console.log('Failed:', e.message);
      }
    }

    console.log('Permissions granted');
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
