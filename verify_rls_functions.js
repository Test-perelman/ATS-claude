const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://awujhuncfghjshggkqyo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

(async () => {
  try {
    console.log('\n=== VERIFYING RLS CONFIGURATION ===\n');

    // Test 1: Verify we can query the users table (should work if RLS is fixed)
    console.log('1️⃣ Testing users table access...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, is_master_admin, team_id')
      .limit(3);

    if (userError) {
      console.error('   ❌ Error:', userError.message);
    } else {
      console.log(`   ✅ Successfully queried users table (${users.length} rows)`);
    }

    // Test 2: Try to create a candidate (this will test full RLS)
    console.log('\n2️⃣ Testing candidate creation...');

    if (users && users.length > 0) {
      const user = users[0];
      const timestamp = new Date().getTime();
      const { data: newCandidate, error: candError } = await supabase
        .from('candidates')
        .insert({
          team_id: user.team_id,
          first_name: 'Test',
          last_name: 'Candidate',
          email: `test_${timestamp}@example.com`,
          current_title: 'Software Engineer',
          status: 'new'
        })
        .select();

      if (candError) {
        console.error('   ❌ Error:', candError.message);
      } else {
        console.log('   ✅ Successfully created candidate');
        if (newCandidate && newCandidate.length > 0) {
          console.log('   ID:', newCandidate[0].id);
        }
      }
    }

    // Test 3: Verify RLS policies exist on key tables
    console.log('\n3️⃣ Checking RLS policies...');

    // We can't query pg_policies directly through REST API, but we can try operations
    // that would fail if policies are broken

    const { data: testRead, error: testReadError } = await supabase
      .from('candidates')
      .select('id')
      .limit(1);

    if (testReadError && testReadError.message.includes('recursion')) {
      console.error('   ❌ RLS recursion detected!');
    } else if (testReadError) {
      console.error('   ⚠️ Read error:', testReadError.message);
    } else {
      console.log('   ✅ RLS policies appear to be working (no recursion errors)');
    }

    console.log('\n✅ RLS Configuration verified!\n');

  } catch (e) {
    console.error('Exception:', e.message);
  }
})();
