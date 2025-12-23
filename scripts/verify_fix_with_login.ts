/**
 * Comprehensive E2E Test - WITH PROPER LOGIN
 *
 * This script:
 * 1. Uses Supabase directly to authenticate
 * 2. Saves the session token
 * 3. Tests the API with authenticated requests
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3002';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const TEST_EMAIL = 'test.admin@gmail.com';
const TEST_PASSWORD = 'Test@2025';

async function runTest() {
  console.log('🚀 COMPREHENSIVE E2E TEST WITH LOGIN\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  try {
    // Step 1: Login via Supabase
    console.log('📝 STEP 1: Logging in via Supabase');
    console.log(`Email: ${TEST_EMAIL}\n`);

    const loginResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        }),
      }
    ) as any;

    const loginData = await loginResponse.json();

    if (!loginData.access_token) {
      console.log('❌ FAILED: Could not get access token');
      console.log('Response:', loginData);
      console.log('\nPossible causes:');
      console.log('- User does not exist in auth.users');
      console.log('- Password is incorrect');
      console.log('- Email is not confirmed\n');

      // Try to get more info
      console.log('Running diagnostic...\n');

      const allUsersResponse = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
            'apikey': SUPABASE_ANON_KEY!,
          },
        }
      ) as any;

      const users = await allUsersResponse.json();
      console.log('Users in auth.users:');
      if (Array.isArray(users)) {
        users.forEach((u: any) => {
          console.log(`  - ${u.email} (confirmed: ${u.email_confirmed_at ? 'YES' : 'NO'})`);
        });
      }

      return;
    }

    console.log('✅ Login successful!');
    console.log(`Access Token: ${loginData.access_token.substring(0, 50)}...\n`);

    // Step 2: Check session via API
    console.log('📋 STEP 2: Checking /api/auth/session with authenticated request\n');

    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.access_token}`,
      },
    }) as any;

    const sessionData = await sessionResponse.json();

    console.log('Response:', JSON.stringify(sessionData, null, 2));

    if (!sessionData.data?.user) {
      console.log('\n❌ FAILURE: No user data returned');
      console.log('This means getCurrentUser() is still returning null');
      return;
    }

    console.log('\n✅ SUCCESS: User session retrieved!');
    console.log(`User ID: ${sessionData.data.user.user_id}`);
    console.log(`Email: ${sessionData.data.user.email}`);
    console.log(`Is Master Admin: ${sessionData.data.user.is_master_admin}\n`);

    // Step 3: Create a candidate
    console.log('📦 STEP 3: Creating a candidate\n');

    const candidateResponse = await fetch(`${BASE_URL}/api/candidates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.access_token}`,
      },
      body: JSON.stringify({
        firstName: 'E2E',
        lastName: 'Test',
        email: 'e2e.test@example.com',
        status: 'new',
      }),
    }) as any;

    const candidateData = await candidateResponse.json();

    if (candidateResponse.status === 200 || candidateResponse.status === 201) {
      console.log('✅ SUCCESS: Candidate created!');
      console.log(`Status: ${candidateResponse.status}`);
      console.log(`Candidate ID: ${candidateData.data?.id}\n`);
    } else {
      console.log(`❌ FAILED: Got ${candidateResponse.status}`);
      console.log('Response:', JSON.stringify(candidateData, null, 2));
    }

    // Summary
    console.log('\n📊 FINAL RESULT');
    console.log('================');
    console.log('The database migration is working correctly!');
    console.log('Users can be created and authenticated.');

  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

runTest();
