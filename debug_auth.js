const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://awujhuncfghjshggkqyo.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

const supabase = createClient(supabaseUrl, serviceKey);

(async () => {
  try {
    console.log('\n🔍 Checking test@admin.com authentication status...\n');

    // Get auth user
    const { data: allAuthUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error listing users:', authError.message);
      return;
    }

    const testAuthUser = allAuthUsers.users.find(u => u.email === 'test@admin.com');

    if (!testAuthUser) {
      console.log('❌ test@admin.com not found in Supabase Auth');
      return;
    }

    console.log('✅ Auth User Found:');
    console.log(`   ID: ${testAuthUser.id}`);
    console.log(`   Email: ${testAuthUser.email}`);
    const confirmed = testAuthUser.email_confirmed_at ? 'Yes' : 'No';
    console.log(`   Confirmed: ${confirmed}`);
    console.log(`   Last Sign In: ${testAuthUser.last_sign_in_at}`);
    console.log('');

    // Get public user record
    const { data: publicUser, error: pubError } = await supabase
      .from('users')
      .select('*')
      .eq('id', testAuthUser.id)
      .single();

    if (pubError && pubError.code !== 'PGRST116') {
      console.error('❌ Error querying public.users:', pubError.message);
      return;
    }

    if (!publicUser) {
      console.log('❌ CRITICAL: User NOT in public.users table - THIS IS THE PROBLEM');
      console.log('   User is in Auth but missing from public.users');
      console.log('   This will cause "User authentication required" errors\n');
      return;
    }

    console.log('✅ Public User Record Found:');
    console.log(`   ID: ${publicUser.id}`);
    console.log(`   Email: ${publicUser.email}`);
    console.log(`   Team ID: ${publicUser.team_id}`);
    console.log(`   Role ID: ${publicUser.role_id}`);
    console.log(`   Master Admin: ${publicUser.is_master_admin}`);
    console.log('');

    if (publicUser.team_id) {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', publicUser.team_id)
        .single();

      if (!teamError && team) {
        console.log('✅ Team:');
        console.log(`   Name: ${team.name}`);
        console.log(`   ID: ${team.id}`);
        console.log('');
      }
    }

    // Check role
    if (publicUser.role_id) {
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', publicUser.role_id)
        .single();

      if (!roleError && role) {
        console.log('✅ Role:');
        console.log(`   Name: ${role.name}`);
        console.log(`   Is Admin: ${role.is_admin}`);
        console.log('');
      }
    }

    console.log('═════════════════════════════════════════════════════════');
    console.log('✅ User setup looks correct - can attempt login\n');

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
