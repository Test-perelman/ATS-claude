const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://awujhuncfghjshggkqyo.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

const supabase = createClient(supabaseUrl, serviceKey);

(async () => {
  console.log('\n🔍 Checking RLS Recursion Status...\n');

  // Test users table access
  console.log('Test: Accessing users table...');
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .limit(1);

  if (userError) {
    if (userError.message.includes('infinite recursion')) {
      console.log('   ❌ RLS RECURSION DETECTED');
      console.log('   Problem: users table has RLS recursion issue\n');
      console.log('   This is a known issue that should have been fixed');
      console.log('   by migration 20251224001_fix_rls_policies_recursion.sql\n');
    } else {
      console.log(`   Error: ${userError.message}\n`);
    }
  } else {
    console.log(`   ✅ Users table accessible`);
    console.log(`   Found ${users.length} users\n`);
  }

  // Test candidates table
  console.log('Test: Accessing candidates table...');
  const { data: candidates, error: candError } = await supabase
    .from('candidates')
    .select('id')
    .limit(1);

  if (candError) {
    console.log(`   ❌ Error: ${candError.message}\n`);
  } else {
    console.log(`   ✅ Candidates accessible (${candidates.length} records)\n`);
  }

})();
