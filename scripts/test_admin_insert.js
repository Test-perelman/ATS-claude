const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function test() {
  console.log('Testing RLS with service_role bypass...\n');

  // Admin client (service role) - should have full access
  const adminClient = createClient(url, serviceKey, {
    global: {
      headers: { Authorization: `Bearer ${serviceKey}` }
    }
  });

  // Anon client - should fail inserts
  const anonClient = createClient(url, anonKey);

  try {
    console.log('1. Testing service_role INSERT on teams...');
    const { error: teamError } = await adminClient
      .from('teams')
      .insert({
        team_name: 'Test Team Service Role',
        company_name: 'Test Company',
        subscription_tier: 'free',
        is_active: true,
      })
      .select()
      .single();

    if (teamError) {
      console.error('❌ Service role INSERT failed:', teamError.message);
      process.exit(1);
    }
    console.log('✓ Service role INSERT succeeded');

    console.log('\n2. Testing anon client INSERT on teams (should fail)...');
    const { error: anonError } = await anonClient
      .from('teams')
      .insert({
        team_name: 'Test Team Anon',
        company_name: 'Test Company Anon',
        subscription_tier: 'free',
        is_active: true,
      });

    if (!anonError) {
      console.error('❌ Anon INSERT should have failed but succeeded');
      process.exit(1);
    }
    console.log('✓ Anon INSERT correctly blocked:', anonError.message.substring(0, 50));

    console.log('\n3. Testing service_role SELECT from teams...');
    const { data: selectData, error: selectError } = await adminClient
      .from('teams')
      .select('*');

    if (selectError) {
      console.error('❌ Service role SELECT failed:', selectError.message);
      process.exit(1);
    }
    console.log(`✓ Service role SELECT succeeded (found ${selectData.length} teams)`);

    console.log('\n✓ All tests passed! RLS is working correctly.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test error:', err);
    process.exit(1);
  }
}

test();
