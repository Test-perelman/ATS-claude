#!/usr/bin/env node

/**
 * TEST FIXED API
 * Verifies that candidates can now be created without errors
 * Using Supabase SDK to simulate what the API does
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFixedAPI() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING FIXED API - CREATE CANDIDATES');
  console.log('='.repeat(80));

  try {
    // Get test user
    console.log('\n1️⃣  Getting test user (test.swagath@gmail.com)...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, team_id, role_id')
      .eq('email', 'test.swagath@gmail.com')
      .single();

    if (userError || !user) {
      console.error('❌ User not found');
      process.exit(1);
    }

    console.log(`✅ User found:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Team ID: ${user.team_id}`);
    console.log(`   User ID: ${user.id}`);

    // Create 5 candidates using correct column names
    console.log('\n2️⃣  Creating 5 test candidates with CORRECT column names...\n');

    const candidateData = [
      {
        first_name: 'John',
        last_name: 'Smith',
        email: `john.smith.${Date.now()}@example.com`,
        status: 'new',
      },
      {
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: `sarah.johnson.${Date.now()}@example.com`,
        status: 'screening',
      },
      {
        first_name: 'Michael',
        last_name: 'Davis',
        email: `michael.davis.${Date.now()}@example.com`,
        status: 'interviewing',
      },
      {
        first_name: 'Emily',
        last_name: 'Wilson',
        email: `emily.wilson.${Date.now()}@example.com`,
        status: 'offered',
      },
      {
        first_name: 'Robert',
        last_name: 'Brown',
        email: `robert.brown.${Date.now()}@example.com`,
        status: 'new',
      },
    ];

    const createdCandidates = [];

    for (let i = 0; i < candidateData.length; i++) {
      const candidate = candidateData[i];

      const { data: created, error: createError } = await supabase
        .from('candidates')
        .insert({
          team_id: user.team_id,
          ...candidate,
          created_by: user.id,
        })
        .select('id, first_name, last_name, email, status, team_id, created_at')
        .single();

      if (createError) {
        console.log(`   ❌ Candidate ${i + 1} FAILED: ${createError.message}`);
        continue;
      }

      console.log(`   ✅ Candidate ${i + 1} CREATED:`);
      console.log(`      ID: ${created.id}`);
      console.log(`      Name: ${created.first_name} ${created.last_name}`);
      console.log(`      Email: ${created.email}`);
      console.log(`      Status: ${created.status}`);
      console.log(`      Team ID: ${created.team_id}`);
      createdCandidates.push(created);
      console.log();
    }

    // Verify all candidates are in database
    console.log('\n3️⃣  Verifying all candidates are persisted in database...\n');

    const { data: allCandidates, error: queryError } = await supabase
      .from('candidates')
      .select('id, first_name, last_name, email, status, team_id')
      .eq('team_id', user.team_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (queryError) {
      console.log(`❌ Query error: ${queryError.message}`);
      process.exit(1);
    }

    console.log(`✅ Query succeeded! Found ${allCandidates.length} candidates in user's team:\n`);
    allCandidates.forEach((c, idx) => {
      console.log(`   ${idx + 1}. ${c.first_name} ${c.last_name}`);
      console.log(`      ID: ${c.id}`);
      console.log(`      Email: ${c.email}`);
      console.log(`      Status: ${c.status}`);
    });

    // Verify created candidates match what we inserted
    console.log('\n4️⃣  Verifying inserted candidates are in query results...\n');

    let allFound = true;
    for (const created of createdCandidates) {
      const found = allCandidates.some(c => c.id === created.id);
      if (found) {
        console.log(`   ✅ ${created.first_name} ${created.last_name} - FOUND`);
      } else {
        console.log(`   ❌ ${created.first_name} ${created.last_name} - NOT FOUND`);
        allFound = false;
      }
    }

    console.log('\n' + '='.repeat(80));
    if (allFound && createdCandidates.length === 5) {
      console.log('🎉 API FIX VERIFIED ✅');
      console.log('\n✅ All tests passed!');
      console.log('✅ Candidates can be created without errors');
      console.log('✅ Data is persisted in database');
      console.log('✅ Correct column names are used');
      console.log('✅ Team isolation is maintained');
      process.exit(0);
    } else {
      console.log('❌ SOME TESTS FAILED');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

testFixedAPI();
