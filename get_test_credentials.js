const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://awujhuncfghjshggkqyo.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

const supabase = createClient(supabaseUrl, serviceKey);

(async () => {
  try {
    console.log('\n🔍 Fetching existing test credentials...\n');

    // Get users with their teams and roles
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, team_id, is_master_admin, roles(id, name, is_admin)')
      .limit(5);

    if (userError) {
      console.error('Error:', userError.message);
      return;
    }

    console.log('📋 Available Users in Database:\n');

    users.forEach((user, idx) => {
      console.log(`${idx + 1}. Email: ${user.email}`);
      console.log(`   User ID: ${user.id.substring(0, 8)}...`);
      console.log(`   Team: ${user.team_id ? user.team_id.substring(0, 8) + '...' : 'None'}`);
      console.log(`   Master Admin: ${user.is_master_admin}`);
      if (user.roles) {
        console.log(`   Role: ${user.roles.name} (Admin: ${user.roles.is_admin})`);
      }
      console.log('');
    });

    if (users.length > 0) {
      const testUser = users[0];
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`\n✅ RECOMMENDED TEST USER:\n`);
      console.log(`Email: ${testUser.email}`);
      console.log(`Password: You need to reset it or use signup`);
      console.log(`Team: ${testUser.team_id ? 'Has existing team - ready to use!' : 'Need to create team'}`);
      console.log(`Status: ${testUser.is_master_admin ? 'Master Admin - Full Access' : 'Team User'}\n`);
    }

  } catch (err) {
    console.error('Exception:', err.message);
  }
})();
