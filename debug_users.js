const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://awujhuncfghjshggkqyo.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

const serviceRoleClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: 'public' },
});

async function debugUsers() {
  try {
    // Get ALL users with test.local emails
    const { data: users, error } = await serviceRoleClient
      .from('users')
      .select('id, email, team_id, is_master_admin')
      .like('email', '%test.local%');

    if (error) {
      console.error('Error:', error);
      process.exit(1);
    }

    console.log('All test users in database:');
    users.forEach(u => console.log(`  ${u.email}: team_id=${u.team_id}, is_master_admin=${u.is_master_admin}`));

    // Get teams
    const { data: teams } = await serviceRoleClient
      .from('teams')
      .select('id, name')
      .in('name', ['Team A', 'Team B']);

    console.log('\nAll test teams in database:');
    teams.forEach(t => console.log(`  ${t.name}: ${t.id}`));

  } catch (error) {
    console.error('Fatal:', error);
    process.exit(1);
  }
}

debugUsers();
