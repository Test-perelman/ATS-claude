const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://awujhuncfghjshggkqyo.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

const supabase = createClient(supabaseUrl, serviceKey);

(async () => {
  try {
    console.log('\n🔧 Creating test user...\n');

    // Create auth user
    console.log('1️⃣ Creating Supabase Auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'test@admin.com',
      password: 'Test@2025',
      email_confirm: true
    });

    if (authError) {
      console.error('   ❌ Error:', authError.message);
      process.exit(1);
    }

    const userId = authData.user.id;
    console.log('   ✅ Auth user created');
    console.log(`   User ID: ${userId}\n`);

    // Get an existing team
    console.log('2️⃣ Finding a team to assign...');
    const { data: teams, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .limit(1);

    if (teamError || !teams || teams.length === 0) {
      console.error('   ❌ No teams found');
      process.exit(1);
    }

    const teamId = teams[0].id;
    console.log(`   ✅ Found team: ${teams[0].name}`);
    console.log(`   Team ID: ${teamId}\n`);

    // Get owner/admin role for this team
    console.log('3️⃣ Finding admin role for team...');
    const { data: roles, error: roleError } = await supabase
      .from('roles')
      .select('id, name, is_admin')
      .eq('team_id', teamId)
      .eq('is_admin', true)
      .limit(1);

    if (roleError || !roles || roles.length === 0) {
      console.error('   ❌ No admin role found for team');
      process.exit(1);
    }

    const roleId = roles[0].id;
    console.log(`   ✅ Found role: ${roles[0].name}`);
    console.log(`   Role ID: ${roleId}\n`);

    // Create public.users record
    console.log('4️⃣ Creating public.users record...');
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: 'test@admin.com',
        team_id: teamId,
        role_id: roleId,
        is_master_admin: false
      })
      .select();

    if (userError) {
      console.error('   ❌ Error:', userError.message);
      process.exit(1);
    }

    console.log('   ✅ Public user record created\n');

    // Create team membership
    console.log('5️⃣ Creating team membership...');
    const { data: membership, error: memberError } = await supabase
      .from('team_memberships')
      .insert({
        user_id: userId,
        team_id: teamId,
        status: 'approved',
        requested_role_id: roleId,
        approved_at: new Date().toISOString(),
        approved_by: userId
      })
      .select();

    if (memberError) {
      console.error('   ⚠️ Warning:', memberError.message);
      console.log('   (This might already exist, which is fine)\n');
    } else {
      console.log('   ✅ Team membership created\n');
    }

    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('✅ USER CREATED SUCCESSFULLY\n');
    console.log('Login Credentials:');
    console.log(`  Email:    test@admin.com`);
    console.log(`  Password: Test@2025\n`);
    console.log('Account Details:');
    console.log(`  Team:     ${teams[0].name}`);
    console.log(`  Role:     ${roles[0].name} (Admin)\n`);
    console.log('Now go to: https://ats-claude.vercel.app');
    console.log('Click "Sign in"');
    console.log('Enter the credentials above\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
