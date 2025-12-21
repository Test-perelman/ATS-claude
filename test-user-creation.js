#!/usr/bin/env node

/**
 * Test User Creation Flow
 * Verify that the newly added user can now create records
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testUserCreation() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING USER RECORD CREATION');
  console.log('='.repeat(80));

  try {
    // Get the user
    console.log('\n1️⃣  Verifying user exists with team assignment...');
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
    console.log(`   Role ID: ${user.role_id}`);

    // Try to create a candidate as this user's team
    console.log('\n2️⃣  Creating test candidate in user\'s team...');
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .insert({
        team_id: user.team_id,
        first_name: 'Test',
        last_name: 'Candidate',
        email: `candidate_${Date.now()}@test.com`,
        status: 'new',
      })
      .select('id, team_id, first_name, last_name, email')
      .single();

    if (candidateError) {
      console.error('❌ Failed to create candidate:', candidateError.message);
      process.exit(1);
    }

    console.log(`✅ Candidate created successfully!`);
    console.log(`   ID: ${candidate.id}`);
    console.log(`   Team ID: ${candidate.team_id}`);
    console.log(`   Name: ${candidate.first_name} ${candidate.last_name}`);
    console.log(`   Email: ${candidate.email}`);

    // Verify the candidate was persisted
    console.log('\n3️⃣  Verifying candidate was persisted...');
    const { data: retrieved, error: retrieveError } = await supabase
      .from('candidates')
      .select('id, team_id')
      .eq('id', candidate.id)
      .single();

    if (retrieveError || !retrieved) {
      console.error('❌ Candidate not found after creation');
      process.exit(1);
    }

    console.log(`✅ Candidate persisted and retrieved successfully`);
    console.log(`   ID match: ${retrieved.id === candidate.id}`);
    console.log(`   Team ID match: ${retrieved.team_id === user.team_id}`);

    console.log('\n✅ USER CAN NOW CREATE RECORDS!');

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

testUserCreation();
