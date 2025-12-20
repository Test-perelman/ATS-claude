#!/usr/bin/env node

/**
 * COMPREHENSIVE QA TEST SUITE FOR PERELMAN ATS
 * This script tests all major features and data flows
 *
 * Requirements:
 * - Node.js environment
 * - Environment variables loaded (.env.local)
 * - Local dev server running on http://localhost:3000
 * - Supabase configured
 */

const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const ADMIN_SETUP_TOKEN = process.env.ADMIN_SETUP_TOKEN || 'change-me-in-production';

// Test tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  blocked: 0,
  issues: []
};

// Helper function to make HTTP requests
function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: { raw: data }
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Test helper
function test(name, fn) {
  return async () => {
    testResults.total++;
    console.log(`\n[TEST] ${name}`);
    try {
      const result = await fn();
      if (result.passed) {
        testResults.passed++;
        console.log(`  ✅ PASS: ${result.message}`);
        return result;
      } else if (result.blocked) {
        testResults.blocked++;
        console.log(`  ⏸️ BLOCKED: ${result.message}`);
        return result;
      } else {
        testResults.failed++;
        console.log(`  ❌ FAIL: ${result.message}`);
        if (result.details) console.log(`     Details: ${result.details}`);
        testResults.issues.push({
          test: name,
          severity: result.severity || 'UNKNOWN',
          message: result.message,
          details: result.details
        });
        return result;
      }
    } catch (error) {
      testResults.failed++;
      console.log(`  ❌ ERROR: ${error.message}`);
      testResults.issues.push({
        test: name,
        severity: 'ERROR',
        message: error.message
      });
      return { passed: false, message: error.message };
    }
  };
}

// Test Cases
const tests = [
  // ====================
  // A. MASTER ADMIN CREATION
  // ====================
  test('A1: Create Master Admin via API', async () => {
    const response = await makeRequest('POST', '/api/admin/create-master-admin', {
      email: 'master@test.com',
      password: 'MasterPass123!@#',
      firstName: 'Master',
      lastName: 'Admin',
      setupToken: ADMIN_SETUP_TOKEN
    });

    if (response.status === 200 && response.body.success) {
      return {
        passed: true,
        message: 'Master admin created successfully',
        data: response.body.data
      };
    } else {
      return {
        passed: false,
        severity: 'CRITICAL',
        message: 'Failed to create master admin',
        details: `Status: ${response.status}, Error: ${response.body.error || 'Unknown'}`
      };
    }
  }),

  // ====================
  // B. TEAM SIGNUP
  // ====================
  test('B1: Team Signup (Create Team + User)', async () => {
    const response = await makeRequest('POST', '/api/auth/team-signup', {
      email: 'user1@test.com',
      password: 'User123!@#',
      firstName: 'John',
      lastName: 'Doe',
      companyName: 'QA Test Company',
      teamName: 'QA Team'
    });

    if (response.status === 200 && response.body.success) {
      return {
        passed: true,
        message: 'Team signup successful',
        data: response.body.data
      };
    } else {
      return {
        passed: false,
        severity: 'CRITICAL',
        message: 'Team signup failed',
        details: `Status: ${response.status}, Error: ${response.body.error || 'Unknown'}`
      };
    }
  }),

  // ====================
  // C. AUTHENTICATION
  // ====================
  test('C1: Get Current User (Session Test)', async () => {
    const response = await makeRequest('GET', '/api/auth/user');

    // Check if user is authenticated
    if (response.status === 200 && response.body.user) {
      return {
        passed: true,
        message: 'User authenticated and session valid',
        data: response.body.user
      };
    } else {
      return {
        blocked: true,
        message: 'No authenticated session - may not be logged in or session failed'
      };
    }
  }),

  // ====================
  // D. CANDIDATE CREATION
  // ====================
  test('D1: Create Candidate', async () => {
    const response = await makeRequest('POST', '/api/candidates', {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-0123',
      status: 'new',
      current_title: 'Senior Developer',
      current_company: 'Tech Corp',
      experience_years: 5,
      skills: ['JavaScript', 'React', 'Node.js']
    });

    if (response.status === 200 && response.body.success) {
      return {
        passed: true,
        message: 'Candidate created successfully',
        data: response.body.data
      };
    } else if (response.status === 401) {
      return {
        blocked: true,
        message: 'Authentication required - user not logged in'
      };
    } else {
      return {
        passed: false,
        severity: 'HIGH',
        message: 'Failed to create candidate',
        details: `Status: ${response.status}, Error: ${response.body.error || 'Unknown'}`
      };
    }
  }),

  // ====================
  // E. CLIENT CREATION
  // ====================
  test('E1: Create Client', async () => {
    const response = await makeRequest('POST', '/api/clients', {
      name: 'Acme Corporation',
      industry: 'Technology',
      contact_name: 'Jane Smith',
      contact_email: 'jane@acme.com',
      status: 'active'
    });

    if (response.status === 200 && response.body.success) {
      return {
        passed: true,
        message: 'Client created successfully',
        data: response.body.data
      };
    } else if (response.status === 401) {
      return {
        blocked: true,
        message: 'Authentication required'
      };
    } else {
      return {
        passed: false,
        severity: 'HIGH',
        message: 'Failed to create client',
        details: `Status: ${response.status}, Error: ${response.body.error || 'Unknown'}`
      };
    }
  }),

  // ====================
  // F. JOB REQUIREMENT CREATION
  // ====================
  test('F1: Create Job Requirement', async () => {
    const response = await makeRequest('POST', '/api/requirements', {
      title: 'Senior React Developer',
      description: 'Looking for experienced React developer',
      client_id: 'placeholder',  // Would be actual client_id from E1
      status: 'open'
    });

    if (response.status === 200 && response.body.success) {
      return {
        passed: true,
        message: 'Job requirement created',
        data: response.body.data
      };
    } else if (response.status === 401) {
      return {
        blocked: true,
        message: 'Authentication required'
      };
    } else {
      return {
        passed: false,
        severity: 'MEDIUM',
        message: 'Failed to create requirement',
        details: `Status: ${response.status}`
      };
    }
  }),

  // ====================
  // G. SUBMISSION CREATION
  // ====================
  test('G1: Create Submission', async () => {
    const response = await makeRequest('POST', '/api/submissions', {
      requirement_id: 'placeholder',
      candidate_id: 'placeholder',
      status: 'submitted'
    });

    if (response.status === 200 && response.body.success) {
      return {
        passed: true,
        message: 'Submission created',
        data: response.body.data
      };
    } else if (response.status === 401) {
      return {
        blocked: true,
        message: 'Authentication required'
      };
    } else {
      return {
        passed: false,
        severity: 'MEDIUM',
        message: 'Failed to create submission',
        details: `Status: ${response.status}`
      };
    }
  }),

  // ====================
  // H. INTERVIEW SCHEDULING
  // ====================
  test('H1: Create Interview', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const response = await makeRequest('POST', '/api/interviews', {
      submission_id: 'placeholder',
      scheduled_at: tomorrow.toISOString(),
      status: 'scheduled'
    });

    if (response.status === 200 && response.body.success) {
      return {
        passed: true,
        message: 'Interview scheduled',
        data: response.body.data
      };
    } else if (response.status === 401) {
      return {
        blocked: true,
        message: 'Authentication required'
      };
    } else {
      return {
        passed: false,
        severity: 'MEDIUM',
        message: 'Failed to schedule interview',
        details: `Status: ${response.status}`
      };
    }
  }),

  // ====================
  // I. PERMISSION CHECKS
  // ====================
  test('I1: Master Admin Can Access All Teams', async () => {
    const response = await makeRequest('GET', '/api/teams');

    if (response.status === 200) {
      return {
        passed: true,
        message: 'Teams endpoint accessible',
        data: response.body
      };
    } else if (response.status === 401) {
      return {
        blocked: true,
        message: 'Not authenticated'
      };
    } else {
      return {
        passed: false,
        severity: 'MEDIUM',
        message: 'Teams endpoint failed',
        details: `Status: ${response.status}`
      };
    }
  }),

  // ====================
  // J. ROLE MANAGEMENT
  // ====================
  test('J1: Get Available Roles', async () => {
    const response = await makeRequest('GET', '/api/roles');

    if (response.status === 200 && Array.isArray(response.body.data)) {
      return {
        passed: true,
        message: `Roles retrieved (${response.body.data.length} roles)`,
        data: response.body.data
      };
    } else if (response.status === 401) {
      return {
        blocked: true,
        message: 'Not authenticated'
      };
    } else {
      return {
        passed: false,
        severity: 'MEDIUM',
        message: 'Failed to get roles',
        details: `Status: ${response.status}`
      };
    }
  }),

  // ====================
  // K. ERROR HANDLING
  // ====================
  test('K1: Invalid Master Admin Token Rejected', async () => {
    const response = await makeRequest('POST', '/api/admin/create-master-admin', {
      email: 'invalid@test.com',
      password: 'Pass123!@#',
      firstName: 'Invalid',
      lastName: 'Admin',
      setupToken: 'INVALID_TOKEN'
    });

    if (response.status === 401) {
      return {
        passed: true,
        message: 'Invalid token correctly rejected'
      };
    } else {
      return {
        passed: false,
        severity: 'CRITICAL',
        message: 'Invalid token was not rejected!',
        details: `Status: ${response.status}`
      };
    }
  }),

  test('K2: Unauthorized Access to Candidate Creation', async () => {
    // Without auth session
    const response = await makeRequest('POST', '/api/candidates', {
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com'
    });

    if (response.status === 401 || response.status === 403) {
      return {
        passed: true,
        message: 'Unauthorized access correctly rejected'
      };
    } else if (response.status === 200) {
      return {
        passed: false,
        severity: 'CRITICAL',
        message: 'SECURITY ISSUE: Candidate creation allowed without auth!',
        details: `Received status ${response.status} instead of 401/403`
      };
    } else {
      return {
        blocked: true,
        message: `Endpoint returned unexpected status: ${response.status}`
      };
    }
  })
];

// Run all tests
async function runAllTests() {
  console.log('========================================');
  console.log('PERELMAN ATS - COMPREHENSIVE QA TESTS');
  console.log('========================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('');

  for (const testFn of tests) {
    await testFn();
  }

  // Print summary
  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏸️ Blocked: ${testResults.blocked}`);
  console.log('');

  if (testResults.issues.length > 0) {
    console.log('ISSUES FOUND:');
    console.log('--------');
    testResults.issues.forEach((issue, idx) => {
      console.log(`\n${idx + 1}. ${issue.test}`);
      console.log(`   Severity: ${issue.severity}`);
      console.log(`   Message: ${issue.message}`);
      if (issue.details) console.log(`   Details: ${issue.details}`);
    });
  }

  console.log('\n========================================');
  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  console.log(`Pass Rate: ${passRate}%`);

  if (testResults.failed === 0 && testResults.blocked === 0) {
    console.log('Status: ✅ ALL TESTS PASSED');
  } else if (testResults.failed === 0) {
    console.log(`Status: ⏸️ ${testResults.blocked} tests blocked by auth/config issues`);
  } else {
    console.log(`Status: ❌ ${testResults.failed} tests failed`);
  }
  console.log('========================================');
}

runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
