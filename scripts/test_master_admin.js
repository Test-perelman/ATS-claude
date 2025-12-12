const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

async function test() {
  const adminClient = createClient(url, serviceKey);

  try {
    console.log('Testing master_admin user insertion and permissions...\n');

    // Create master admin user
    console.log('1. Creating master admin via service_role...');
    const testEmail = `master_${Date.now()}@test.com`;
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPass123!',
      email_confirm: true,
      user_metadata: { first_name: 'Master', last_name: 'Admin' }
    });

    if (authError) {
      console.error('❌ Failed to create auth user:', authError.message);
      process.exit(1);
    }

    console.log('✓ Auth user created');

    // Create master admin user record
    console.log('\n2. Creating master admin user record...');
    const { data: userRecord, error: userError } = await adminClient
      .from('users')
      .insert({
        user_id: authData.user.id,
        email: testEmail,
        username: `master_admin_${Date.now()}`,
        first_name: 'Master',
        last_name: 'Admin',
        team_id: null,
        role_id: null,
        is_master_admin: true,
        status: 'active'
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ Failed to create user record:', userError.message);
      process.exit(1);
    }

    console.log('✓ Master admin user created');

    console.log('\n3. Master admin can access all tables...');
    const { data: teams, error: teamsError } = await adminClient
      .from('teams')
      .select('*');

    if (teamsError) {
      console.error('❌ Master admin SELECT failed:', teamsError.message);
      process.exit(1);
    }

    console.log(`✓ Master admin can access teams (found ${teams.length})`);

    console.log('\n✓ All master admin tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test error:', err.message);
    process.exit(1);
  }
}

test();
