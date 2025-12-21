#!/usr/bin/env node

/**
 * DIAGNOSTIC API TEST
 * Actually tests the API using Supabase SDK to see what's working and what's not
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const http = require('http');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDirectInsert() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 1: Direct Supabase Insert (Bypassing API)');
  console.log('='.repeat(80));

  try {
    const testCandidate = {
      team_id: '11111111-1111-1111-1111-111111111111',
      first_name: 'Test',
      last_name: 'Direct',
      email: `test.direct.${Date.now()}@test.com`,
      phone: '555-1234',
      status: 'new',
      location: 'New York, NY',
      skills: ['React', 'Node.js'],
      experience_years: 5,
      current_title: 'Developer',
      current_employer: 'Test Co',
      created_by: '5b935ada-e66e-4495-9e17-fa79d59c30c6',
    };

    console.log('\n📝 Attempting direct Supabase insert with data:');
    console.log(JSON.stringify(testCandidate, null, 2));

    const { data, error } = await supabase
      .from('candidates')
      .insert([testCandidate])
      .select();

    if (error) {
      console.error('❌ Direct insert failed:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error);
      return null;
    }

    console.log('✅ Direct insert succeeded!');
    console.log('Inserted candidate:', JSON.stringify(data[0], null, 2));
    return data[0];
  } catch (err) {
    console.error('❌ Exception during direct insert:', err.message);
    return null;
  }
}

async function testGetCandidates() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 2: Get Candidates from Database');
  console.log('='.repeat(80));

  try {
    console.log('\n🔍 Querying candidates for team 11111111-1111-1111-1111-111111111111');

    const { data, error, count } = await supabase
      .from('candidates')
      .select('*', { count: 'exact' })
      .eq('team_id', '11111111-1111-1111-1111-111111111111')
      .limit(5);

    if (error) {
      console.error('❌ Query failed:', error.message);
      return null;
    }

    console.log(`✅ Query succeeded! Found ${count} candidates`);
    console.log(`\nShowing first 5:`);
    data.forEach((c, i) => {
      console.log(`${i + 1}. ${c.first_name} ${c.last_name} (${c.email})`);
    });
    return data;
  } catch (err) {
    console.error('❌ Exception during query:', err.message);
    return null;
  }
}

async function testTableSchema() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 3: Check Candidates Table Schema');
  console.log('='.repeat(80));

  try {
    console.log('\n📋 Fetching one candidate to see actual columns...');

    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Failed:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  No candidates in database');
      return null;
    }

    const candidate = data[0];
    console.log('✅ Found candidate. Actual columns in database:');
    Object.keys(candidate).forEach(key => {
      console.log(`   - ${key}: ${typeof candidate[key]} = ${JSON.stringify(candidate[key]).substring(0, 50)}`);
    });

    return candidate;
  } catch (err) {
    console.error('❌ Exception:', err.message);
    return null;
  }
}

async function testAPIEndpoint() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 4: Test API Endpoint (if server running)');
  console.log('='.repeat(80));

  try {
    console.log('\n📡 Attempting to call http://localhost:3000/api/candidates');
    console.log('⚠️  This will only work if server is running on localhost:3000');

    return new Promise((resolve) => {
      const req = http.get('http://localhost:3000/api/candidates', { timeout: 5000 }, (res) => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          console.log(`\nAPI Response Status: ${res.statusCode}`);
          console.log('Response Headers:', res.headers);
          try {
            const json = JSON.parse(body);
            console.log('✅ API returned JSON:', JSON.stringify(json, null, 2).substring(0, 200));
            resolve(true);
          } catch {
            console.log('❌ API returned non-JSON:', body.substring(0, 200));
            resolve(false);
          }
        });
      });

      req.on('error', (err) => {
        console.log(`❌ Could not reach API: ${err.message}`);
        console.log('Make sure server is running: npm run dev');
        resolve(false);
      });
    });
  } catch (err) {
    console.error('❌ Exception:', err.message);
    return false;
  }
}

async function testUserQuery() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 5: Verify Test User in Database');
  console.log('='.repeat(80));

  try {
    console.log('\n👤 Looking for test user: test.swagath@gmail.com');

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'test.swagath@gmail.com');

    if (error) {
      console.error('❌ Query failed:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      console.error('❌ Test user not found!');
      return null;
    }

    const user = data[0];
    console.log('✅ Test user found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Team ID: ${user.team_id}`);
    console.log(`   Role ID: ${user.role_id}`);
    console.log(`   Master Admin: ${user.is_master_admin}`);

    return user;
  } catch (err) {
    console.error('❌ Exception:', err.message);
    return null;
  }
}

async function main() {
  console.log('\n╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('║' + ' DIAGNOSTIC API TEST - Using Supabase SDK'.padEnd(78) + '║');
  console.log('║' + ' Verify what actually works in the database'.padEnd(78) + '║');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');

  // Test 1: Verify user exists
  const user = await testUserQuery();
  if (!user) {
    console.error('\n❌ Cannot proceed - test user not found');
    process.exit(1);
  }

  // Test 2: Check schema
  await testTableSchema();

  // Test 3: Try direct insert
  const inserted = await testDirectInsert();

  // Test 4: Query candidates
  await testGetCandidates();

  // Test 5: Try API endpoint
  await testAPIEndpoint();

  console.log('\n' + '='.repeat(80));
  console.log('DIAGNOSTIC COMPLETE');
  console.log('='.repeat(80));
  console.log(`
✅ = Working correctly
❌ = Not working / needs fix

Use the results above to identify what needs to be fixed.
  `);
}

main().catch(console.error);
