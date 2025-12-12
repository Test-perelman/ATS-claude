const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  try {
    console.log('Granting full permissions...');
    
    const tables = [
      'teams', 'users', 'roles', 'role_permissions', 'role_templates', 
      'permissions', 'template_permissions', 'teams_usage'
    ];

    const roles = ['anon', 'authenticated', 'service_role'];

    for (const table of tables) {
      for (const role of roles) {
        const stmt = `GRANT ALL PRIVILEGES ON ${table} TO ${role}`;
        try {
          await supabase.rpc('exec_sql', { sql: stmt });
          console.log(`✓ ${role} on ${table}`);
        } catch (e) {
          // Ignore errors
        }
      }
    }

    console.log('Permissions granted to all roles');
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
