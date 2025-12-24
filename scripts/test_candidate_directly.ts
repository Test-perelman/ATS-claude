/**
 * Direct Candidate Creation Test
 *
 * Tests creating a candidate with full error details
 */

import fetch from 'node-fetch'

const SUPABASE_URL = 'https://awujhuncfghjshggkqyo.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTc4NjIsImV4cCI6MjA3OTE5Mzg2Mn0.Y3Vn2pKfmRJcCkNzxXBz2R4FC3AcXfLudIsNrLzuiFc'
const PRODUCTION_URL = 'https://ats-claude.vercel.app'

const TEST_EMAIL = 'test.admin@gmail.com'
const TEST_PASSWORD = 'Test@2025'

console.log('═══════════════════════════════════════════════════════════')
console.log('DIRECT CANDIDATE CREATION TEST')
console.log('═══════════════════════════════════════════════════════════\n')

async function test() {
  try {
    // Step 1: Login
    console.log('Step 1: Logging in...')
    const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    }) as any

    const loginData = await loginResponse.json()
    const accessToken = (loginData as any).access_token

    if (!accessToken) {
      console.error('❌ Login failed:', loginData)
      return
    }

    console.log('✅ Logged in\n')

    // Step 2: Create candidate
    console.log('Step 2: Creating candidate...')

    const candidatePayload = {
      firstName: 'DirectTest',
      lastName: `Candidate-${Date.now()}`,
      email: `direct-test-${Date.now()}@example.com`,
      phone: '555-1234',
    }

    console.log('Payload:', JSON.stringify(candidatePayload, null, 2))
    console.log('')

    const candResponse = await fetch(`${PRODUCTION_URL}/api/candidates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(candidatePayload),
    }) as any

    const candData = await candResponse.json()

    console.log(`Response Status: ${candResponse.status}`)
    console.log('Response:')
    console.log(JSON.stringify(candData, null, 2))

    if (candResponse.status === 200 || candResponse.status === 201) {
      console.log('\n✅ SUCCESS! Candidate created!')
    } else {
      console.log('\n❌ FAILED')
      if ((candData as any).error) {
        console.log('Error:', (candData as any).error)
      }
    }

  } catch (error: any) {
    console.error('❌ Test error:', error.message)
  }
}

test()
