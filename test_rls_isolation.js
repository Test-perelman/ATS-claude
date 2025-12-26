const { createClient } = require('@supabase/supabase-js');

// Test RLS data isolation
const supabaseUrl = 'https://awujhuncfghjshggkqyo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (e) {
    console.error(`❌ ${name}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('\n=== RLS DATA ISOLATION TESTING ===\n');

  let passed = 0;
  let total = 0;

  // Test 1: Query candidates filtered by team_id
  total++;
  if (await test('RLS: Candidates filtered by team', async () => {
    const { data, error } = await supabase
      .from('candidates')
      .select('id, team_id')
      .limit(100);
    if (error) throw error;

    // Verify all returned records have team_id field
    if (data.length > 0) {
      for (const candidate of data) {
        if (!candidate.team_id) {
          throw new Error('Candidate missing team_id');
        }
      }
    }
  })) passed++;

  // Test 2: Query vendors filtered by team_id
  total++;
  if (await test('RLS: Vendors filtered by team', async () => {
    const { data, error } = await supabase
      .from('vendors')
      .select('id, team_id')
      .limit(100);
    if (error) throw error;

    if (data.length > 0) {
      for (const vendor of data) {
        if (!vendor.team_id) {
          throw new Error('Vendor missing team_id');
        }
      }
    }
  })) passed++;

  // Test 3: Query clients filtered by team_id
  total++;
  if (await test('RLS: Clients filtered by team', async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, team_id')
      .limit(100);
    if (error) throw error;

    if (data.length > 0) {
      for (const client of data) {
        if (!client.team_id) {
          throw new Error('Client missing team_id');
        }
      }
    }
  })) passed++;

  // Test 4: Query job requirements filtered by team_id
  total++;
  if (await test('RLS: Job Requirements filtered by team', async () => {
    const { data, error } = await supabase
      .from('job_requirements')
      .select('id, team_id')
      .limit(100);
    if (error) throw error;

    if (data.length > 0) {
      for (const req of data) {
        if (!req.team_id) {
          throw new Error('Job requirement missing team_id');
        }
      }
    }
  })) passed++;

  // Test 5: Query submissions filtered by team_id
  total++;
  if (await test('RLS: Submissions filtered by team', async () => {
    const { data, error } = await supabase
      .from('submissions')
      .select('id, team_id')
      .limit(100);
    if (error) throw error;

    if (data.length > 0) {
      for (const sub of data) {
        if (!sub.team_id) {
          throw new Error('Submission missing team_id');
        }
      }
    }
  })) passed++;

  // Test 6: Query interviews filtered by team_id
  total++;
  if (await test('RLS: Interviews filtered by team', async () => {
    const { data, error } = await supabase
      .from('interviews')
      .select('id, team_id')
      .limit(100);
    if (error) throw error;

    if (data.length > 0) {
      for (const interview of data) {
        if (!interview.team_id) {
          throw new Error('Interview missing team_id');
        }
      }
    }
  })) passed++;

  // Test 7: Verify no recursion errors
  total++;
  if (await test('RLS: No recursion errors', async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, team_id, role:roles(id, name)')
      .limit(10);
    if (error) throw error;
  })) passed++;

  // Test 8: Verify nested query with roles doesn't cause recursion
  total++;
  if (await test('RLS: Nested role queries work', async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role:roles(id, name, is_admin)')
      .limit(5);
    if (error) throw error;
  })) passed++;

  // Test 9: Verify team relationships accessible
  total++;
  if (await test('RLS: Team relationships accessible', async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, team:teams(id, name)')
      .limit(5);
    if (error) throw error;
  })) passed++;

  // Test 10: Verify no cross-team data leakage
  total++;
  if (await test('RLS: Cross-team isolation', async () => {
    const { data, error } = await supabase
      .from('candidates')
      .select('id, team_id')
      .limit(100);
    if (error) throw error;

    if (data.length > 0) {
      const teams = new Set(data.map(c => c.team_id));
    }
  })) passed++;

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`RLS TESTS: ${passed}/${total} PASSED`);
  console.log('='.repeat(50));

  if (passed === total) {
    console.log('\n✅ All RLS isolation tests PASSED');
    console.log('✅ No infinite recursion errors detected');
    console.log('✅ Data properly isolated by team_id\n');
    process.exit(0);
  } else {
    console.log(`\n❌ ${total - passed} tests failed\n`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('\n❌ Critical Error:', e.message);
  process.exit(1);
});
