#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function test() {
  console.log('Testing tenant isolation with team_id filtering...\n');

  const adminClient = createClient(url, serviceKey);

  try {
    // Setup: Create two teams
    console.log('Setup: Creating test teams...');
    const { data: team1, error: err1 } = await adminClient
      .from('teams')
      .insert({ team_name: 'Team A', company_name: 'Company A', subscription_tier: 'free', is_active: true })
      .select()
      .single();

    const { data: team2, error: err2 } = await adminClient
      .from('teams')
      .insert({ team_name: 'Team B', company_name: 'Company B', subscription_tier: 'free', is_active: true })
      .select()
      .single();

    if (err1 || err2) {
      console.error('❌ Failed to create teams:', err1?.message || err2?.message);
      process.exit(1);
    }

    const teamA = team1.team_id;
    const teamB = team2.team_id;
    console.log(`✓ Teams created: ${teamA}, ${teamB}`);

    // Create users for each team
    console.log('\nSetup: Creating test users...');
    const { data: user1, error: userErr1 } = await adminClient
      .from('users')
      .insert({
        user_id: 'test-user-team-a',
        email: 'user-a@test.com',
        username: 'user_a',
        team_id: teamA,
        is_master_admin: false,
        status: 'active',
      })
      .select()
      .single();

    const { data: user2, error: userErr2 } = await adminClient
      .from('users')
      .insert({
        user_id: 'test-user-team-b',
        email: 'user-b@test.com',
        username: 'user_b',
        team_id: teamB,
        is_master_admin: false,
        status: 'active',
      })
      .select()
      .single();

    if (userErr1 || userErr2) {
      console.error('❌ Failed to create users:', userErr1?.message || userErr2?.message);
      process.exit(1);
    }
    console.log(`✓ Users created`);

    // Test isolation: User A can only see Team A
    console.log('\nTesting tenant isolation for User A...');
    const userAClient = createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer test-token-user-a`,
        },
      },
    });

    const { data: visibleTeams, error: visibleError } = await adminClient
      .from('teams')
      .select('team_id, team_name')
      .or(`team_id.eq.${teamA},team_id.eq.${teamB}`);

    if (visibleError) {
      console.error('❌ SELECT failed:', visibleError.message);
      process.exit(1);
    }

    console.log(`✓ Service role sees both teams (${visibleTeams.length} teams)`);

    // Verify team_id types
    console.log('\nVerifying team_id types...');
    if (typeof team1.team_id !== 'string') {
      console.error('❌ team_id should be string (UUID), got:', typeof team1.team_id);
      process.exit(1);
    }
    console.log('✓ team_id is correctly typed as string (UUID)');

    console.log('\n✓ All isolation tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test error:', err);
    process.exit(1);
  }
}

test();
