const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

async function test() {
  const client = createClient(url, serviceKey);

  try {
    console.log('Testing direct insert with service role key...');
    
    const { data, error } = await client
      .from('teams')
      .insert({ team_name: 'Test', company_name: 'Test Co', subscription_tier: 'free', is_active: true })
      .select()
      .single();

    if (error) {
      console.error('❌ Error:', error.message);
      console.error('Code:', error.code);
      process.exit(1);
    }
    
    console.log('✓ SUCCESS! Team created:', data.team_id);
    process.exit(0);
  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
}

test();
