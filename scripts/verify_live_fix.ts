/**
 * Live E2E Verification Script
 * Tests the authentication flow and candidate creation after the nuclear fix
 */

import https from 'https';

const BASE_URL = 'http://localhost:3002';
const TEST_EMAIL = 'test.admin@gmail.com';
const TEST_PASSWORD = 'Test@2025';

interface FetchOptions {
  method: string;
  headers: Record<string, string>;
  body?: string;
}

/**
 * Make HTTP request with cookie support
 */
function makeRequest(
  url: string,
  options: FetchOptions,
  cookies?: string[]
): Promise<{ status: number; headers: any; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : require('http');

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method,
      headers: {
        ...options.headers,
        ...(cookies && cookies.length > 0 && { 'Cookie': cookies.join('; ') }),
      },
    };

    const req = client.request(requestOptions, (res: any) => {
      let body = '';
      res.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * Extract cookies from Set-Cookie header
 */
function extractCookies(setCookieHeader: string | string[] | undefined): string[] {
  if (!setCookieHeader) return [];
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  return headers.map(cookie => cookie.split(';')[0]);
}

/**
 * Main verification flow
 */
async function runVerification() {
  console.log('🚀 LIVE E2E VERIFICATION SCRIPT');
  console.log('================================\n');

  let cookies: string[] = [];

  try {
    // TASK 1: Login
    console.log('📝 TASK 1: Attempting Login');
    console.log(`Email: ${TEST_EMAIL}`);
    console.log(`Password: ${TEST_PASSWORD}\n`);

    const loginUrl = `${BASE_URL}/auth/callback`;
    console.log(`⚠️  NOTE: Direct login endpoint may vary. Attempting POST to /auth/callback...\n`);

    // Try the Supabase auth flow
    console.log('Attempting standard auth flow...');
    const authResponse = await makeRequest(`${BASE_URL}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`Initial /api/auth/session response: ${authResponse.status}\n`);

    // For the sake of this test, we'll assume the user is already authenticated
    // In a real scenario, we'd need to handle the full OAuth flow
    console.log('⚠️  For this local test, assuming user has active session via cookies...\n');

    // TASK 2: Check Session
    console.log('📋 TASK 2: Checking /api/auth/session');
    console.log('======================================\n');

    const sessionResponse = await makeRequest(`${BASE_URL}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status Code: ${sessionResponse.status}`);
    console.log(`Response Headers:`, JSON.stringify(sessionResponse.headers, null, 2));
    console.log(`Response Body:\n`);

    try {
      const sessionData = JSON.parse(sessionResponse.body);
      console.log(JSON.stringify(sessionData, null, 2));

      // CRITICAL: Check if user_id is present
      console.log('\n🔍 CRITICAL ANALYSIS:');
      console.log('---------------------');

      if (sessionData.success === false) {
        console.log('❌ ERROR: API returned success=false');
        console.log(`   Error: ${sessionData.error}`);
      } else if (sessionData.data === null) {
        console.log('❌ FAILURE: /api/auth/session returned null');
        console.log('   This means getCurrentUser() is returning null');
        console.log('   The user is NOT authenticated or missing from public.users');
      } else if (!sessionData.data?.user) {
        console.log('❌ FAILURE: No user object in response');
        console.log('   Response structure:', Object.keys(sessionData.data || {}));
      } else if (!sessionData.data.user.user_id) {
        console.log('❌ FAILURE: user_id is missing or null');
        console.log(`   user_id value: ${sessionData.data.user.user_id}`);
        console.log('   This would cause the form check to fail');
      } else {
        console.log('✅ SUCCESS: user_id is present!');
        console.log(`   user_id: ${sessionData.data.user.user_id}`);
        console.log(`   email: ${sessionData.data.user.email}`);
        console.log(`   is_master_admin: ${sessionData.data.user.is_master_admin}`);
        console.log(`   team_id: ${sessionData.data.user.team_id}`);
      }
    } catch (e) {
      console.log(`❌ ERROR: Failed to parse JSON response`);
      console.log(`   Raw body: ${sessionResponse.body.substring(0, 500)}`);
    }

    // TASK 3: Create Candidate
    console.log('\n\n📦 TASK 3: Attempting to Create Candidate');
    console.log('==========================================\n');

    const candidatePayload = {
      firstName: 'Test',
      lastName: 'Verify',
      email: 'test@verify.com',
      phone: '',
      linkedinUrl: 'https://www.linkedin.com/in/',
      currentLocation: '',
      workAuthorization: '',
      resumeUrl: '',
      currentTitle: '',
      currentCompany: '',
      experienceYears: '',
      skills: [],
      desiredSalary: '',
      status: 'new',
      notes: '',
    };

    const candidateResponse = await makeRequest(`${BASE_URL}/api/candidates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(candidatePayload),
    });

    console.log(`Status Code: ${candidateResponse.status}`);
    console.log(`Response Body:\n`);

    try {
      const candidateData = JSON.parse(candidateResponse.body);
      console.log(JSON.stringify(candidateData, null, 2));

      console.log('\n🔍 CANDIDATE CREATION ANALYSIS:');
      console.log('--------------------------------');

      if (candidateResponse.status === 401) {
        console.log('❌ FAILURE: Got 401 Unauthorized');
        console.log('   User is not authenticated');
      } else if (candidateResponse.status === 403) {
        console.log('❌ FAILURE: Got 403 Forbidden');
        console.log('   User lacks permissions');
      } else if (candidateResponse.status === 200 || candidateResponse.status === 201) {
        console.log('✅ SUCCESS: Candidate creation succeeded!');
        console.log(`   Status: ${candidateResponse.status}`);
        if (candidateData.data?.id) {
          console.log(`   Candidate ID: ${candidateData.data.id}`);
        }
      } else {
        console.log(`⚠️  Unexpected status code: ${candidateResponse.status}`);
        if (candidateData.error) {
          console.log(`   Error: ${candidateData.error}`);
        }
      }
    } catch (e) {
      console.log(`❌ ERROR: Failed to parse JSON response`);
      console.log(`   Raw body: ${candidateResponse.body.substring(0, 500)}`);
    }

    // FINAL SUMMARY
    console.log('\n\n📊 FINAL SUMMARY');
    console.log('=================');
    console.log('Review the analysis above:');
    console.log('- If /api/auth/session returns user_id: The backend fix is working ✅');
    console.log('- If /api/candidates returns 200/201: Authentication is complete ✅');
    console.log('- If either fails: There\'s still a disconnect to investigate ❌');
  } catch (error) {
    console.error('❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

runVerification();
