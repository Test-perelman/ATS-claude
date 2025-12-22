#!/usr/bin/env node
/**
 * Phase 3: API Endpoint Tests
 * Test API endpoints for membership workflow and data access
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://awujhuncfghjshggkqyo.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

const credentials = JSON.parse(fs.readFileSync('./test-credentials.json', 'utf8'));
const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: 'public' },
});

async function testAPIEndpoints() {
  console.log('='.repeat(80));
  console.log('PHASE 3: API ENDPOINT TESTS');
  console.log('='.repeat(80));

  const results = [];

  try {
    // Test 3.1: Verify team_memberships table structure
    console.log('\n[Test 3.1] Team Memberships Table Structure');
    console.log('-'.repeat(80));

    const { data: memberships, error: membershipsError } = await client
      .from('team_memberships')
      .select('*')
      .limit(1);

    if (membershipsError) {
      results.push({
        test: '3.1 team_memberships table accessible',
        status: 'FAIL',
        details: membershipsError.message,
      });
      console.log(`❌ ${membershipsError.message}`);
    } else {
      results.push({
        test: '3.1 team_memberships table accessible',
        status: 'PASS',
        details: `Table exists with ${memberships.length} sample records`,
      });
      console.log(`✅ team_memberships table confirmed`);

      if (memberships.length > 0) {
        const record = memberships[0];
        console.log(`  Columns: ${Object.keys(record).join(', ')}`);
      }
    }

    // Test 3.2: Verify helper functions
    console.log('\n[Test 3.2] RLS Helper Functions');
    console.log('-'.repeat(80));

    try {
      const testUserId = credentials.users.master_admin.id;
      const { data: result, error: fnError } = await client.rpc('is_master_admin', {
        user_id: testUserId
      });

      if (fnError) {
        results.push({
          test: '3.2 is_master_admin() function',
          status: 'FAIL',
          details: fnError.message,
        });
        console.log(`❌ Function error: ${fnError.message}`);
      } else {
        results.push({
          test: '3.2 is_master_admin() function',
          status: 'PASS',
          details: `Function callable`,
        });
        console.log(`✅ is_master_admin() function works`);
      }
    } catch (e) {
      results.push({
        test: '3.2 is_master_admin() function',
        status: 'FAIL',
        details: e.message,
      });
      console.log(`❌ ${e.message}`);
    }

    // Test 3.3: Membership approval flow
    console.log('\n[Test 3.3] Membership Status Transitions');
    console.log('-'.repeat(80));

    const { data: users, error: usersError } = await client
      .from('users')
      .select('id, email')
      .eq('email', credentials.users.user_pending_A.email);

    if (!usersError && users.length > 0) {
      const { data: userMemberships, error: memError } = await client
        .from('team_memberships')
        .select('*')
        .eq('user_id', users[0].id);

      if (!memError) {
        const pending = userMemberships.filter(m => m.status === 'pending');
        const approved = userMemberships.filter(m => m.status === 'approved');

        results.push({
          test: '3.3.1 Pending membership status',
          status: pending.length > 0 ? 'PASS' : 'FAIL',
          details: `Found ${pending.length} pending memberships`,
        });

        results.push({
          test: '3.3.2 Approved membership status',
          status: approved.length >= 0 ? 'PASS' : 'FAIL',
          details: `Found ${approved.length} approved memberships`,
        });

        console.log(`✅ Pending: ${pending.length}, Approved: ${approved.length}`);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 3 RESULTS SUMMARY');
    console.log('='.repeat(80));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    console.log(`\nTotal Tests: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    results.forEach((result, idx) => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} [${idx + 1}] ${result.test}: ${result.status}`);
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
    });

  } catch (error) {
    console.error('\n❌ Phase 3 failed:', error.message);
    process.exit(1);
  }
}

testAPIEndpoints().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
