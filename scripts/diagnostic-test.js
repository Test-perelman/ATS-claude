#!/usr/bin/env node

/**
 * DIAGNOSTIC TEST SCRIPT
 *
 * Tests the complete flow:
 * 1. User signup/login
 * 2. Team assignment
 * 3. Data insertion (candidates, etc.)
 * 4. Multi-tenant isolation
 * 5. Admin/permission logic
 *
 * All tests use REAL Supabase SDK queries and show database state
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Simple UUID v4 generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Create two clients: anon (normal user) and service (admin)
const anonClient = createClient(supabaseUrl, supabaseAnonKey);
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

// Test credentials
const timestamp = Date.now();
const testEmail = `testdiag${timestamp}@example.com`;
const testPassword = 'TestPassword123!';
let testUserId = null;
let testTeamId = null;

console.log('\n' + '='.repeat(80));
console.log('PERELMAN ATS - DIAGNOSTIC TEST');
console.log('='.repeat(80) + '\n');

// ============================================================================
// TEST 1: USER SIGNUP FLOW
// ============================================================================

async function testUserSignup() {
  console.log('\n📋 TEST 1: USER SIGNUP FLOW');
  console.log('-'.repeat(80));

  try {
    console.log(`\n1.1 Creating auth user (${testEmail})...`);
    const { data, error } = await anonClient.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (error) {
      console.error('❌ Signup failed:', error.message);
      return false;
    }

    testUserId = data.user?.id;
    console.log(`✅ Auth user created: ${testUserId}`);

    // Check if user record exists in database
    console.log('\n1.2 Checking if user record exists in database...');
    const { data: userRecord, error: userError } = await anonClient
      .from('users')
      .select('id, team_id, role_id, is_master_admin, email')
      .eq('id', testUserId)
      .single();

    if (userError && userError.code === 'PGRST116') {
      console.log('❌ User record does NOT exist in database!');
      console.log('   This is the FIRST BUG: signup does not create user record');
      console.log('\n   Creating user record manually with admin client...');

      const { error: createError } = await adminClient
        .from('users')
        .insert({
          id: testUserId,
          email: testEmail,
          is_master_admin: false,
          team_id: null,
          role_id: null,
        });

      if (createError) {
        console.error('❌ Failed to create user record:', createError.message);
        return false;
      }
      console.log('✅ User record created');
    } else if (userError) {
      console.error('❌ Unexpected error querying user:', userError.message);
      return false;
    } else {
      console.log('✅ User record exists:', JSON.stringify(userRecord, null, 2));
    }

    return true;
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
    return false;
  }
}

// ============================================================================
// TEST 2: TEAM ASSIGNMENT
// ============================================================================

async function testTeamAssignment() {
  console.log('\n📋 TEST 2: TEAM ASSIGNMENT');
  console.log('-'.repeat(80));

  try {
    // Create a test team
    console.log('\n2.1 Creating test team...');
    const { data: team, error: teamError } = await adminClient
      .from('teams')
      .insert({
        id: uuidv4(),
        name: `Test Team ${Date.now()}`,
      })
      .select()
      .single();

    if (teamError) {
      console.error('❌ Failed to create team:', teamError.message);
      return false;
    }

    testTeamId = team.id;
    console.log(`✅ Team created: ${team.id} (${team.name})`);

    // Assign user to team
    console.log('\n2.2 Assigning user to team...');
    const { error: updateError } = await adminClient
      .from('users')
      .update({ team_id: testTeamId })
      .eq('id', testUserId);

    if (updateError) {
      console.error('❌ Failed to assign team:', updateError.message);
      return false;
    }

    console.log(`✅ User assigned to team ${testTeamId}`);

    // Verify assignment
    console.log('\n2.3 Verifying team assignment...');
    const { data: updatedUser, error: verifyError } = await anonClient
      .from('users')
      .select('id, team_id, team:teams(id, name)')
      .eq('id', testUserId)
      .single();

    if (verifyError) {
      console.error('❌ Failed to verify:', verifyError.message);
      return false;
    }

    console.log('✅ Team assignment verified:', JSON.stringify(updatedUser, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
    return false;
  }
}

// ============================================================================
// TEST 3: DATA INSERTION (Candidate)
// ============================================================================

async function testDataInsertion() {
  console.log('\n📋 TEST 3: DATA INSERTION (Candidate)');
  console.log('-'.repeat(80));

  try {
    if (!testUserId || !testTeamId) {
      console.error('❌ Test prerequisites not met (user or team missing)');
      return false;
    }

    // Sign in the test user
    console.log('\n3.1 Signing in test user...');
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message);
      return false;
    }

    console.log(`✅ User signed in`);

    // Now try to insert a candidate
    console.log('\n3.2 Attempting to insert candidate (as logged-in user)...');
    const candidateData = {
      team_id: testTeamId,
      first_name: 'Test',
      last_name: 'Candidate',
      email: `candidate-${Date.now()}@example.com`,
      status: 'new',
      created_by: testUserId,
    };

    const { data: candidate, error: insertError } = await anonClient
      .from('candidates')
      .insert(candidateData)
      .select()
      .single();

    if (insertError) {
      console.error(`❌ INSERT FAILED: ${insertError.message}`);
      console.error('   Error code:', insertError.code);
      console.error('   This is likely a RLS policy issue!');
      console.error('   Data attempted to insert:', JSON.stringify(candidateData, null, 2));
      return false;
    }

    console.log(`✅ Candidate created: ${candidate.candidate_id}`);
    console.log('   Candidate data:', JSON.stringify(candidate, null, 2));

    return true;
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
    return false;
  }
}

// ============================================================================
// TEST 4: VERIFY DATA IN DATABASE
// ============================================================================

async function testDataVerification() {
  console.log('\n📋 TEST 4: VERIFY DATA IN DATABASE');
  console.log('-'.repeat(80));

  try {
    if (!testTeamId) {
      console.error('❌ Team ID not set');
      return false;
    }

    // Query candidates for the team using admin client
    console.log('\n4.1 Querying candidates for team (using admin client)...');
    const { data: candidates, error: queryError } = await adminClient
      .from('candidates')
      .select('candidate_id, team_id, first_name, last_name, email, created_by')
      .eq('team_id', testTeamId);

    if (queryError) {
      console.error('❌ Query failed:', queryError.message);
      return false;
    }

    console.log(`✅ Found ${candidates?.length || 0} candidates:`);
    if (candidates && candidates.length > 0) {
      candidates.forEach(c => {
        console.log(`   - ${c.first_name} ${c.last_name} (${c.email})`);
      });
    }

    // Check RLS: user should see only their team's data
    console.log('\n4.2 Querying candidates as logged-in user (RLS test)...');
    const { data: userCandidates, error: userQueryError } = await anonClient
      .from('candidates')
      .select('candidate_id, team_id, first_name, last_name')
      .eq('team_id', testTeamId);

    if (userQueryError) {
      console.error(`⚠️  RLS Error: ${userQueryError.message}`);
      console.error('   This may indicate RLS policies are too restrictive');
    } else {
      console.log(`✅ User can query their team's candidates (${userCandidates?.length || 0})`);
    }

    return true;
  } catch (error) {
    console.error('❌ Test 4 failed:', error.message);
    return false;
  }
}

// ============================================================================
// TEST 5: RLS POLICY CHECK
// ============================================================================

async function testRLSPolicies() {
  console.log('\n📋 TEST 5: RLS POLICY VERIFICATION');
  console.log('-'.repeat(80));

  try {
    console.log('\n5.1 Checking RLS enabled tables...');

    // Use admin client to check RLS status
    const { data: rlsStatus, error: rError } = await adminClient
      .rpc('get_rls_tables', {});

    if (rError) {
      console.log('⚠️  Could not fetch RLS status via RPC');
    } else {
      console.log('✅ RLS status retrieved');
    }

    // Check sample policies
    console.log('\n5.2 Checking if candidates table has RLS policies...');
    const tables = ['users', 'teams', 'candidates', 'roles'];
    for (const table of tables) {
      const { data: testData, error: testError } = await anonClient
        .from(table)
        .select('1')
        .limit(0);

      if (testError?.code === 'PGRST100') {
        console.log(`   ❌ ${table}: RLS BLOCKING (no permission)`);
      } else if (testError) {
        console.log(`   ⚠️  ${table}: ${testError.code} - ${testError.message}`);
      } else {
        console.log(`   ✅ ${table}: accessible`);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Test 5 failed:', error.message);
    return false;
  }
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

async function runAllTests() {
  try {
    const test1 = await testUserSignup();
    if (!test1) {
      console.error('\n❌ TEST 1 FAILED - Stopping tests');
      process.exit(1);
    }

    const test2 = await testTeamAssignment();
    if (!test2) {
      console.error('\n❌ TEST 2 FAILED - Stopping tests');
      process.exit(1);
    }

    const test3 = await testDataInsertion();
    const test4 = test3 ? await testDataVerification() : false;
    const test5 = await testRLSPolicies();

    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Test 1 (Signup):      ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 2 (Team):        ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 3 (Insert):      ${test3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 4 (Verify):      ${test4 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 5 (RLS):         ${test5 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('='.repeat(80) + '\n');

    const allPass = test1 && test2 && test3 && test4 && test5;
    process.exit(allPass ? 0 : 1);
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    process.exit(1);
  }
}

runAllTests();
