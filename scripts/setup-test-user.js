#!/usr/bin/env node

/**
 * Setup Test User
 * Creates or finds the test user (test.swagath@gmail.com)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTestUser() {
  console.log('Checking if test user exists...\n');

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'test.swagath@gmail.com');

  if (error) {
    console.error('Error:', error.message);
    return null;
  }

  if (data && data.length > 0) {
    console.log('✅ Test user found!');
    console.log('\nUser Details:');
    console.log(JSON.stringify(data[0], null, 2));
    return data[0];
  } else {
    console.log('❌ Test user not found');
    console.log('\nTo create the test user:');
    console.log('1. Go to http://localhost:3000/auth/signup');
    console.log('2. Sign up with:');
    console.log('   Email: test.swagath@gmail.com');
    console.log('   Password: 12345678');
    console.log('3. Complete the onboarding');
    console.log('\nThen run the mock data script again.');
    return null;
  }
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST USER SETUP');
  console.log('='.repeat(80) + '\n');

  const user = await checkTestUser();

  if (user) {
    console.log('\n✅ Ready to run: node scripts/create-mock-data-and-verify.js');
  }
}

main().catch(console.error);
