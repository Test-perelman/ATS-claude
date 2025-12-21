#!/usr/bin/env node

/**
 * DIRECT DATABASE TEST
 *
 * Tests RLS policies and data integrity WITHOUT going through auth signup.
 * Uses the service role to create test data, then verifies anon user access.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

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

const anonClient = createClient(supabaseUrl, supabaseAnonKey);
// Create admin client - service role should bypass RLS
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

console.log('\n' + '='.repeat(80));
console.log('DIRECT DATABASE TEST - RLS & SCHEMA VERIFICATION');
console.log('='.repeat(80) + '\n');

async function testDatabase() {
  // ==========================================================================
  // STEP 1: Verify teams table structure
  // ==========================================================================
  console.log('\n📋 STEP 1: VERIFY TEAMS TABLE STRUCTURE');
  console.log('-'.repeat(80));

  try {
    const { data: teams, error } = await adminClient
      .from('teams')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error querying teams:', error.message);
      return;
    }

    if (teams && teams.length > 0) {
      console.log('✅ Teams table sample:');
      console.log(JSON.stringify(teams[0], null, 2));
    } else {
      console.log('⚠️  Teams table is empty');
      console.log('   Creating test team...');

      const { data: newTeam, error: createError } = await adminClient
        .from('teams')
        .insert({
          id: uuidv4(),
          name: `Test Team ${Date.now()}`,
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create team:', createError.message);
        return;
      }

      console.log('✅ Test team created:');
      console.log(JSON.stringify(newTeam, null, 2));
    }
  } catch (error) {
    console.error('❌ Error in STEP 1:', error.message);
    return;
  }

  // ==========================================================================
  // STEP 2: Verify users table structure
  // ==========================================================================
  console.log('\n📋 STEP 2: VERIFY USERS TABLE STRUCTURE');
  console.log('-'.repeat(80));

  try {
    const { data: users, error } = await adminClient
      .from('users')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error querying users:', error.message);
      return;
    }

    if (users && users.length > 0) {
      console.log('✅ Users table sample:');
      const user = users[0];
      console.log(` - id: ${user.id}`);
      console.log(` - team_id: ${user.team_id}`);
      console.log(` - role_id: ${user.role_id}`);
      console.log(` - is_master_admin: ${user.is_master_admin}`);
      console.log(` - email: ${user.email}`);

      // Check if this user can read their own row
      console.log('\n   Testing RLS: Can user read their own row?');
      console.log(`   (Simulating auth as user: ${user.id})`);

      // Note: We can't actually authenticate as a specific user easily here,
      // but we can check what the RLS allows
      const { data: selfRead, error: selfError } = await anonClient
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (selfError) {
        console.error(`   ❌ RLS blocks self-read: ${selfError.message}`);
      } else {
        console.log('   ✅ Self-read allowed');
      }
    } else {
      console.log('⚠️  Users table is empty - no test users');
    }
  } catch (error) {
    console.error('❌ Error in STEP 2:', error.message);
    return;
  }

  // ==========================================================================
  // STEP 3: Verify candidates table structure
  // ==========================================================================
  console.log('\n📋 STEP 3: VERIFY CANDIDATES TABLE STRUCTURE');
  console.log('-'.repeat(80));

  try {
    // Get first team ID
    const { data: teams, error: teamError } = await adminClient
      .from('teams')
      .select('id')
      .limit(1);

    if (teamError || !teams || teams.length === 0) {
      console.log('⚠️  No teams available to test candidates');
      return;
    }

    const teamId = teams[0].id;
    console.log(`Using team: ${teamId}`);

    // Check if any candidates exist for this team
    const { data: candidates, error } = await adminClient
      .from('candidates')
      .select('*')
      .eq('team_id', teamId)
      .limit(1);

    if (error) {
      console.error(`❌ Error querying candidates: ${error.message}`);
      console.error(`   Code: ${error.code}`);
      console.error(`   This likely indicates a schema mismatch!`);
      return;
    }

    if (candidates && candidates.length > 0) {
      console.log('✅ Candidates table sample:');
      const c = candidates[0];
      console.log(` - candidate_id: ${c.candidate_id}`);
      console.log(` - team_id: ${c.team_id}`);
      console.log(` - first_name: ${c.first_name}`);
      console.log(` - last_name: ${c.last_name}`);
      console.log(` - email: ${c.email}`);
      console.log(` - status: ${c.status}`);
    } else {
      console.log('⚠️  No existing candidates - testing INSERT...');

      const testCandidate = {
        team_id: teamId,
        first_name: 'Test',
        last_name: 'Candidate',
        email: `test${Date.now()}@example.com`,
        phone: '+1234567890',
        status: 'new',
        created_by: null,
      };

      console.log('\n   Attempting INSERT with admin client...');
      const { data: insertedCandidate, error: insertError } = await adminClient
        .from('candidates')
        .insert(testCandidate)
        .select()
        .single();

      if (insertError) {
        console.error(`   ❌ INSERT failed: ${insertError.message}`);
        console.error(`   Code: ${insertError.code}`);
        console.error('   Data attempted:', JSON.stringify(testCandidate, null, 2));
        return;
      }

      console.log('   ✅ INSERT succeeded:');
      console.log(`   - candidate_id: ${insertedCandidate.candidate_id}`);
      console.log(`   - Created at: ${insertedCandidate.created_at}`);
    }
  } catch (error) {
    console.error('❌ Error in STEP 3:', error.message);
    return;
  }

  // ==========================================================================
  // STEP 4: Check RLS policies
  // ==========================================================================
  console.log('\n📋 STEP 4: RLS POLICY CHECK');
  console.log('-'.repeat(80));

  try {
    console.log('\nChecking table permissions for authenticated users...\n');

    const tables = ['users', 'teams', 'roles', 'candidates', 'vendors', 'clients', 'job_requirements'];

    for (const table of tables) {
      const { error } = await anonClient
        .from(table)
        .select('1')
        .limit(0);

      if (error?.code === 'PGRST100') {
        console.log(`❌ ${table.padEnd(20)} - BLOCKED (RLS denies all access)`);
      } else if (error) {
        console.log(`⚠️  ${table.padEnd(20)} - Error: ${error.code}`);
      } else {
        console.log(`✅ ${table.padEnd(20)} - Accessible`);
      }
    }
  } catch (error) {
    console.error('❌ Error in STEP 4:', error.message);
    return;
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80) + '\n');
}

testDatabase().catch(console.error);
