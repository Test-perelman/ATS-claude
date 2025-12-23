/**
 * PRODUCTION E2E TEST
 *
 * This script tests the complete flow in production:
 * 1. Login with real credentials
 * 2. Get session token
 * 3. Test /api/auth/session
 * 4. Create a candidate
 * 5. Report results
 */

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://awujhuncfghjshggkqyo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTc4NjIsImV4cCI6MjA3OTE5Mzg2Mn0.Y3Vn2pKfmRJcCkNzxXBz2R4FC3AcXfLudIsNrLzuiFc';
const PRODUCTION_URL = 'https://ats-claude.vercel.app';

const TEST_EMAIL = 'test.admin@gmail.com';
const TEST_PASSWORD = 'Test@2025';

interface TestResult {
  step: string;
  status: 'PASS' | 'FAIL';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logResult(step: string, status: 'PASS' | 'FAIL', message: string, details?: any) {
  const result: TestResult = { step, status, message, details };
  results.push(result);
  console.log(`\n[${status}] ${step}`);
  console.log(`    ${message}`);
  if (details) {
    console.log(`    Details: ${JSON.stringify(details).substring(0, 200)}`);
  }
}

async function runTest() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('PRODUCTION E2E TEST - Authentication & Candidate Creation');
  console.log('═══════════════════════════════════════════════════════════\n');

  let accessToken: string | null = null;
  let session: any = null;

  try {
    // STEP 1: Login via Supabase
    console.log('STEP 1: Logging in via Supabase Auth...');
    const loginUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;

    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    }) as any;

    const loginData = await loginResponse.json();

    if (!loginData.access_token) {
      logResult(
        'Supabase Login',
        'FAIL',
        `Failed to login: ${loginData.error_description || JSON.stringify(loginData).substring(0, 100)}`,
        loginData
      );
      throw new Error('Login failed');
    }

    accessToken = loginData.access_token;
    logResult(
      'Supabase Login',
      'PASS',
      `Successfully logged in as ${TEST_EMAIL}`,
      { token: accessToken.substring(0, 50) + '...' }
    );

    // STEP 2: Check /api/auth/session
    console.log('\nSTEP 2: Checking /api/auth/session...');
    const sessionUrl = `${PRODUCTION_URL}/api/auth/session`;

    const sessionResponse = await fetch(sessionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    }) as any;

    const sessionData = await sessionResponse.json();

    if (!sessionData.data?.user) {
      logResult(
        '/api/auth/session',
        'FAIL',
        `No user returned: ${JSON.stringify(sessionData).substring(0, 100)}`,
        sessionData
      );
      throw new Error('Session check failed');
    }

    session = sessionData.data;
    logResult(
      '/api/auth/session',
      'PASS',
      `User session retrieved successfully`,
      {
        user_id: session.user?.user_id,
        email: session.user?.email,
        team_id: session.user?.team_id,
        is_master_admin: session.user?.is_master_admin,
      }
    );

    if (!session.user?.user_id) {
      logResult(
        'User ID Check',
        'FAIL',
        'user_id is missing or null - THIS IS THE BUG',
        session.user
      );
      throw new Error('user_id is missing');
    }

    logResult(
      'User ID Check',
      'PASS',
      `user_id is present: ${session.user.user_id}`,
    );

    // STEP 3: Create a Candidate
    console.log('\nSTEP 3: Creating a test candidate...');
    const candidateUrl = `${PRODUCTION_URL}/api/candidates`;
    const timestamp = Date.now();

    const candidatePayload = {
      firstName: 'E2E-Test',
      lastName: `Candidate-${timestamp}`,
      email: `e2e-test-${timestamp}@example.com`,
      phone: '123-456-7890',
      linkedinUrl: 'https://www.linkedin.com/in/test',
      currentLocation: 'Test City',
      workAuthorization: 'us_citizen',
      resumeUrl: 'https://example.com/resume.pdf',
      currentTitle: 'Test Engineer',
      currentCompany: 'Test Corp',
      experienceYears: 5,
      skills: ['JavaScript', 'TypeScript', 'React'],
      desiredSalary: 150000,
      status: 'new',
      notes: 'E2E Test Candidate',
    };

    const candidateResponse = await fetch(candidateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(candidatePayload),
    }) as any;

    const candidateData = await candidateResponse.json();

    if (candidateResponse.status !== 200 && candidateResponse.status !== 201) {
      logResult(
        'Create Candidate',
        'FAIL',
        `HTTP ${candidateResponse.status}: ${candidateData.error || JSON.stringify(candidateData).substring(0, 100)}`,
        candidateData
      );
      throw new Error(`Candidate creation failed with status ${candidateResponse.status}`);
    }

    if (!candidateData.data?.id) {
      logResult(
        'Create Candidate',
        'FAIL',
        `No candidate ID returned: ${JSON.stringify(candidateData).substring(0, 100)}`,
        candidateData
      );
      throw new Error('No candidate ID returned');
    }

    logResult(
      'Create Candidate',
      'PASS',
      `Candidate created successfully`,
      {
        candidate_id: candidateData.data.id,
        name: `${candidatePayload.firstName} ${candidatePayload.lastName}`,
        email: candidatePayload.email,
      }
    );

    // STEP 4: Verify Candidate in Database
    console.log('\nSTEP 4: Verifying candidate exists in database...');

    // Query the candidate we just created
    const verifyUrl = `${PRODUCTION_URL}/api/candidates?search=${candidatePayload.lastName}`;

    const verifyResponse = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    }) as any;

    const verifyData = await verifyResponse.json();

    if (!verifyData.data || verifyData.data.length === 0) {
      logResult(
        'Verify Candidate',
        'FAIL',
        'Candidate not found in database',
        verifyData
      );
    } else {
      const found = verifyData.data.find((c: any) => c.last_name === candidatePayload.lastName);
      if (found) {
        logResult(
          'Verify Candidate',
          'PASS',
          `Candidate verified in database`,
          {
            id: found.id,
            name: `${found.first_name} ${found.last_name}`,
            created_by: found.created_by,
          }
        );
      }
    }

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
  }

  // FINAL REPORT
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('FINAL REPORT');
  console.log('═══════════════════════════════════════════════════════════\n');

  const passes = results.filter(r => r.status === 'PASS').length;
  const fails = results.filter(r => r.status === 'FAIL').length;

  console.log('Test Results:');
  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.step}: ${result.message}`);
  });

  console.log(`\nSummary: ${passes} PASSED, ${fails} FAILED\n`);

  if (fails === 0 && passes >= 4) {
    console.log('🎉 SUCCESS! The fix is working in production!');
    console.log('\nThe "User authentication required" error has been FIXED.');
    console.log('Users can now create candidates without errors.');
    return true;
  } else {
    console.log('❌ FAILURE! The fix is NOT working in production.');
    console.log('\nThe error is still occurring. Further investigation needed.');
    return false;
  }
}

runTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
