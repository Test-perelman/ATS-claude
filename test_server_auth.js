/**
 * Test Server-Side Auth Cookie Reading
 *
 * This script:
 * 1. Logs in via the Supabase client (simulating browser)
 * 2. Extracts the auth cookies
 * 3. Makes server-side API calls with those cookies
 * 4. Verifies the server can read them
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TEST_EMAIL = 'test@admin.com';
const TEST_PASSWORD = 'test123456';
const BASE_URL = 'http://localhost:3004';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

async function runTests() {
  console.log('========================================');
  console.log('AUTHENTICATION FIX VERIFICATION');
  console.log('========================================\n');

  // Step 1: Sign in with Supabase client
  console.log('Step 1: Signing in with Supabase client...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (authError) {
    console.error('❌ Login failed:', authError.message);
    process.exit(1);
  }

  console.log('✅ Login successful');
  console.log('   User ID:', authData.user.id);
  console.log('   Email:', authData.user.email);

  // Step 2: Extract session token
  const session = authData.session;
  if (!session) {
    console.error('❌ No session returned');
    process.exit(1);
  }

  console.log('\nStep 2: Session token extracted');
  console.log('   Access Token:', session.access_token.substring(0, 20) + '...');

  // Step 3: Build cookie header
  // The Supabase auth cookie format for server-side
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\./)?.[1];
  if (!projectRef) {
    console.error('❌ Could not extract project ref from URL');
    process.exit(1);
  }

  const authCookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = encodeURIComponent(JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    token_type: 'bearer',
    user: authData.user,
  }));

  const cookieHeader = `${authCookieName}=${cookieValue}`;
  console.log('\nStep 3: Cookie prepared');
  console.log('   Cookie Name:', authCookieName);
  console.log('   Cookie Length:', cookieValue.length, 'bytes');

  // Test 1: Cookie visibility in debug endpoint
  console.log('\n========================================');
  console.log('TEST 1: Server Cookie Visibility');
  console.log('========================================');

  const debugResponse = await fetch(`${BASE_URL}/api/debug/auth`, {
    headers: {
      'Cookie': cookieHeader,
    },
  });

  const debugData = await debugResponse.json();
  console.log('\nDebug endpoint response:');
  console.log('  Total cookies seen:', debugData.steps[0].totalCookies);
  console.log('  Supabase cookies:', debugData.steps[0].supabaseCookieNames);
  console.log('  Auth user found:', debugData.steps[2].hasUser ? 'YES ✅' : 'NO ❌');

  const test1Pass = debugData.steps[0].supabaseCookieNames.includes(authCookieName) && debugData.steps[2].hasUser;

  // Test 2: /api/auth/session endpoint
  console.log('\n========================================');
  console.log('TEST 2: /api/auth/session Returns User');
  console.log('========================================');

  const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: {
      'Cookie': cookieHeader,
    },
  });

  const sessionData = await sessionResponse.json();
  console.log('\nSession endpoint response:');
  console.log('  Success:', sessionData.success);
  console.log('  User:', sessionData.data?.user ? `${sessionData.data.user.user_id} (${sessionData.data.user.email})` : 'NULL ❌');

  const test2Pass = sessionData.success && sessionData.data && sessionData.data.user;

  // Test 3: Protected route (/api/candidates)
  console.log('\n========================================');
  console.log('TEST 3: Protected Route Success');
  console.log('========================================');

  const candidatesResponse = await fetch(`${BASE_URL}/api/candidates`, {
    headers: {
      'Cookie': cookieHeader,
    },
  });

  const candidatesData = await candidatesResponse.json();
  console.log('\nCandidates endpoint response:');
  console.log('  Status:', candidatesResponse.status);
  console.log('  Success:', candidatesData.success);
  console.log('  Error:', candidatesData.error || 'None');

  const test3Pass = candidatesResponse.status === 200 && candidatesData.success;

  // Final Report
  console.log('\n========================================');
  console.log('AUTH FIX STATUS:', test1Pass && test2Pass && test3Pass ? 'PASS ✅' : 'FAIL ❌');
  console.log('========================================');
  console.log('Server cookies visible:', test1Pass ? 'YES' : 'NO');
  console.log('Server getUser() resolves user:', debugData.steps[2].hasUser ? 'YES' : 'NO');
  console.log('/api/auth/session returns user:', test2Pass ? 'YES' : 'NO');
  console.log('Protected routes succeed:', test3Pass ? 'YES' : 'NO');
  console.log('========================================\n');

  process.exit(test1Pass && test2Pass && test3Pass ? 0 : 1);
}

runTests().catch(error => {
  console.error('❌ Test script error:', error);
  process.exit(1);
});
