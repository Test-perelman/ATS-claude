/**
 * API Endpoint Verification Script
 * Tests all newly created endpoints with mock data
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000'

// Mock data
const mockData = {
  client: {
    clientName: 'Acme Corporation',
    industry: 'Technology',
    website: 'https://acme.com',
    primaryContactName: 'Jane Smith',
    primaryContactEmail: 'jane@acme.com',
    primaryContactPhone: '555-0101',
    status: 'active',
    notes: 'New client partnership',
  },
  vendor: {
    vendorName: 'Tech Staffing Inc',
    companyName: 'Tech Staffing Inc',
    email: 'contact@techstaffing.com',
    phone: '555-0102',
    website: 'https://techstaffing.com',
    status: 'active',
    notes: 'Reliable vendor',
  },
  requirement: {
    jobTitle: 'Senior Backend Engineer',
    jobDescription: 'Looking for an experienced backend engineer',
    skillsRequired: 'Node.js, TypeScript, PostgreSQL',
    clientId: 'client_001',
    vendorId: 'vendor_001',
    location: 'San Francisco, CA',
    workMode: 'Remote',
    billRateRangeMin: 80,
    billRateRangeMax: 120,
    employmentType: 'Contract',
    duration: '6 months',
    priority: 'High',
    status: 'open',
    notes: 'Urgent - high priority project',
  },
  submission: {
    candidateId: 'cand_001',
    jobId: 'job_001',
    submissionStatus: 'submitted',
    billRateOffered: 100,
    payRateOffered: 70,
    margin: 30,
    notes: 'Strong candidate with relevant experience',
    submittedAt: new Date().toISOString(),
  },
  interview: {
    submissionId: 'sub_001',
    interviewRound: 'Technical',
    scheduledTime: new Date(Date.now() + 86400000).toISOString(),
    interviewerName: 'John Doe',
    interviewMode: 'Video',
    interviewLocation: 'https://zoom.us/meeting',
  },
}

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

async function testEndpoint(method, path, data = null) {
  const url = `${BASE_URL}${path}`
  console.log(
    `\n${colors.blue}Testing: ${colors.reset}${method} ${path}`
  )

  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (data) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(url, options)
    const responseData = await response.json()

    if (response.ok && responseData.success) {
      console.log(
        `${colors.green}✓ PASS${colors.reset} - Status: ${response.status}`
      )
      if (responseData.data) {
        console.log(`  Data ID: ${responseData.data.id || responseData.data.requirement_id || responseData.data.submission_id || responseData.data.interview_id || 'N/A'}`)
      }
      return { success: true, data: responseData.data }
    } else {
      console.log(
        `${colors.red}✗ FAIL${colors.reset} - Status: ${response.status}`
      )
      console.log(`  Error: ${responseData.error || 'Unknown error'}`)
      return { success: false }
    }
  } catch (error) {
    console.log(
      `${colors.red}✗ ERROR${colors.reset} - ${error.message}`
    )
    return { success: false }
  }
}

async function runTests() {
  console.log(
    `${colors.yellow}=== API Endpoint Verification ===${colors.reset}`
  )
  console.log(`Base URL: ${BASE_URL}\n`)

  let results = {
    clientPost: false,
    clientGet: false,
    vendorPost: false,
    vendorGet: false,
    requirementPost: false,
    submissionPost: false,
    interviewPost: false,
    requirementGet: false,
    submissionGet: false,
    interviewGet: false,
  }

  // Test Clients
  console.log(`\n${colors.yellow}--- Testing Clients Endpoints ---${colors.reset}`)
  const clientResult = await testEndpoint(
    'POST',
    '/api/clients',
    mockData.client
  )
  results.clientPost = clientResult.success

  const clientGetResult = await testEndpoint('GET', '/api/clients')
  results.clientGet = clientGetResult.success

  // Test Vendors
  console.log(`\n${colors.yellow}--- Testing Vendors Endpoints ---${colors.reset}`)
  const vendorResult = await testEndpoint(
    'POST',
    '/api/vendors',
    mockData.vendor
  )
  results.vendorPost = vendorResult.success

  const vendorGetResult = await testEndpoint('GET', '/api/vendors')
  results.vendorGet = vendorGetResult.success

  // Test Requirements
  console.log(`\n${colors.yellow}--- Testing Requirements Endpoints ---${colors.reset}`)
  const requirementResult = await testEndpoint(
    'POST',
    '/api/requirements',
    mockData.requirement
  )
  results.requirementPost = requirementResult.success

  const requirementGetResult = await testEndpoint('GET', '/api/requirements')
  results.requirementGet = requirementGetResult.success

  // Test Submissions
  console.log(`\n${colors.yellow}--- Testing Submissions Endpoints ---${colors.reset}`)
  const submissionResult = await testEndpoint(
    'POST',
    '/api/submissions',
    mockData.submission
  )
  results.submissionPost = submissionResult.success

  const submissionGetResult = await testEndpoint('GET', '/api/submissions')
  results.submissionGet = submissionGetResult.success

  // Test Interviews
  console.log(`\n${colors.yellow}--- Testing Interviews Endpoints ---${colors.reset}`)
  const interviewResult = await testEndpoint(
    'POST',
    '/api/interviews',
    mockData.interview
  )
  results.interviewPost = interviewResult.success

  const interviewGetResult = await testEndpoint('GET', '/api/interviews')
  results.interviewGet = interviewGetResult.success

  // Summary
  console.log(`\n${colors.yellow}=== Test Summary ===${colors.reset}`)
  const allPassed = Object.values(results).every((v) => v === true)

  console.log(
    `Clients POST: ${results.clientPost ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`
  )
  console.log(
    `Clients GET: ${results.clientGet ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`
  )
  console.log(
    `Vendors POST: ${results.vendorPost ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`
  )
  console.log(
    `Vendors GET: ${results.vendorGet ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`
  )
  console.log(
    `Requirements POST: ${results.requirementPost ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`
  )
  console.log(
    `Requirements GET: ${results.requirementGet ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`
  )
  console.log(
    `Submissions POST: ${results.submissionPost ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`
  )
  console.log(
    `Submissions GET: ${results.submissionGet ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`
  )
  console.log(
    `Interviews POST: ${results.interviewPost ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`
  )
  console.log(
    `Interviews GET: ${results.interviewGet ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`
  )

  console.log(
    `\nOverall: ${allPassed ? colors.green + '✓ ALL TESTS PASSED' : colors.red + '✗ SOME TESTS FAILED'}${colors.reset}\n`
  )

  process.exit(allPassed ? 0 : 1)
}

runTests()
