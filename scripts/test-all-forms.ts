/**
 * Comprehensive Test Data Script
 * Tests all forms in the application with complete data
 *
 * Usage: ts-node scripts/test-all-forms.ts
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';

// Initialize Supabase client (you'll need to set these environment variables)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Test data
const testData = {
  candidate: {
    first_name: 'John',
    last_name: 'TestCandidate',
    email_address: `test.candidate.${Date.now()}@example.com`,
    phone_number: '555-0123',
    linkedin_url: 'https://www.linkedin.com/in/johntestcandidate',
    current_location: 'New York, NY',
    relocation_preference: 'Open to relocation',
    total_experience_years: 8.5,
    skills_primary: 'Java, Spring Boot, Microservices, AWS, Docker, Kubernetes',
    skills_secondary: 'Python, React, Node.js, PostgreSQL, MongoDB',
    preferred_roles: 'Full Stack Developer, Backend Developer, Solutions Architect',
    hourly_pay_rate: 85.00,
    salary_annual: 156000,
    bench_status: 'available' as const,
    notes_internal: 'Excellent candidate with strong technical skills. Available immediately.',
    ssn_last4: '1234',
    date_of_birth: '1990-05-15',
    passport_number: 'N123456789',
    work_authorization_notes: 'US Citizen, no restrictions',
    terms_percentage: 15.5,
  },
  client: {
    client_name: 'Test Corp Industries',
    contact_name: 'Jane TestClient',
    contact_email: `test.client.${Date.now()}@testcorp.com`,
    contact_phone: '555-0456',
    industry: 'Technology',
    address: '123 Tech Street, Suite 400, San Francisco, CA 94105',
    website: 'https://www.testcorp.com',
    preferred_communication_mode: 'Email',
    payment_terms: 'Net 30',
    payment_terms_days: 30,
    is_active: true,
    notes: 'Major technology company, excellent payment history',
  },
  vendor: {
    vendor_name: 'Test Staffing Solutions',
    tier_level: 'Tier 1' as const,
    contact_name: 'Bob TestVendor',
    contact_email: `test.vendor.${Date.now()}@teststaffing.com`,
    contact_phone: '555-0789',
    preferred_communication_mode: 'Phone',
    payment_terms: 'Net 45',
    payment_terms_days: 45,
    website: 'https://www.teststaffing.com',
    address: '456 Staffing Ave, Chicago, IL 60601',
    is_active: true,
  },
  requirement: {
    job_title: 'Senior Full Stack Developer',
    client_billing_rate: 125.00,
    candidate_pay_rate: 85.00,
    max_submissions: 5,
    required_skills: 'Java, Spring Boot, React, AWS, Microservices',
    preferred_skills: 'Kubernetes, Docker, CI/CD, GraphQL',
    job_location: 'San Francisco, CA',
    work_mode: 'Hybrid' as const,
    experience_required_years: 8,
    contract_duration_months: 12,
    contract_type: 'C2C' as const,
    visa_requirement: 'US Citizen or Green Card preferred',
    job_description: 'We are looking for an experienced Full Stack Developer to join our team and work on cutting-edge cloud-native applications. The ideal candidate will have strong experience with Java backend development and modern React frontend development.',
    responsibility_description: '- Design and develop microservices using Java and Spring Boot\n- Build responsive user interfaces with React\n- Deploy and maintain applications on AWS\n- Collaborate with cross-functional teams\n- Mentor junior developers',
    additional_notes: 'This is a high-priority position with potential for extension.',
    requirement_status: 'open' as const,
  },
  submission: {
    submission_status: 'submitted' as const,
    submission_notes: 'Strong match for the position. Candidate has all required skills and 2 years additional experience.',
    expected_response_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
  },
  interview: {
    interview_type: 'Technical' as const,
    interview_mode: 'Video Call' as const,
    interview_round: 1,
    interview_location: 'Zoom Meeting',
    duration_minutes: 60,
    interview_notes: 'First round technical interview. Focus on Java, Spring Boot, and system design.',
    interviewer_feedback: '',
  },
};

async function testCandidateCreation(teamId: string, userId: string, visaStatusId: string) {
  console.log('\n📋 Testing Candidate Creation...');

  try {
    const { data, error } = await supabase
      .from('candidates')
      .insert({
        ...testData.candidate,
        visa_status_id: visaStatusId,
        team_id: teamId,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Candidate creation failed:', error.message);
      return null;
    }

    console.log('✅ Candidate created successfully:', data.candidate_id);
    console.log('   Name:', `${data.first_name} ${data.last_name}`);
    console.log('   Email:', data.email_address);
    console.log('   Skills:', data.skills_primary?.substring(0, 50) + '...');
    return data;
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return null;
  }
}

async function testClientCreation(teamId: string, userId: string) {
  console.log('\n🏢 Testing Client Creation...');

  try {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        ...testData.client,
        team_id: teamId,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Client creation failed:', error.message);
      return null;
    }

    console.log('✅ Client created successfully:', data.client_id);
    console.log('   Name:', data.client_name);
    console.log('   Contact:', data.contact_email);
    return data;
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return null;
  }
}

async function testVendorCreation(teamId: string, userId: string) {
  console.log('\n🤝 Testing Vendor Creation...');

  try {
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        ...testData.vendor,
        team_id: teamId,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Vendor creation failed:', error.message);
      return null;
    }

    console.log('✅ Vendor created successfully:', data.vendor_id);
    console.log('   Name:', data.vendor_name);
    console.log('   Tier:', data.tier_level);
    return data;
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return null;
  }
}

async function testRequirementCreation(teamId: string, userId: string, clientId: string) {
  console.log('\n📄 Testing Requirement Creation...');

  try {
    const { data, error } = await supabase
      .from('requirements')
      .insert({
        ...testData.requirement,
        client_id: clientId,
        team_id: teamId,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Requirement creation failed:', error.message);
      return null;
    }

    console.log('✅ Requirement created successfully:', data.requirement_id);
    console.log('   Job Title:', data.job_title);
    console.log('   Location:', data.job_location);
    console.log('   Work Mode:', data.work_mode);
    return data;
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return null;
  }
}

async function testSubmissionCreation(
  teamId: string,
  userId: string,
  candidateId: string,
  requirementId: string,
  vendorId: string
) {
  console.log('\n📤 Testing Submission Creation...');

  try {
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        ...testData.submission,
        candidate_id: candidateId,
        requirement_id: requirementId,
        vendor_id: vendorId,
        team_id: teamId,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Submission creation failed:', error.message);
      return null;
    }

    console.log('✅ Submission created successfully:', data.submission_id);
    console.log('   Status:', data.submission_status);
    console.log('   Expected Response:', data.expected_response_date);
    return data;
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return null;
  }
}

async function testInterviewCreation(
  teamId: string,
  userId: string,
  submissionId: string
) {
  console.log('\n🎤 Testing Interview Creation...');

  const interviewDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

  try {
    const { data, error } = await supabase
      .from('interviews')
      .insert({
        ...testData.interview,
        submission_id: submissionId,
        interview_date: interviewDate.toISOString().split('T')[0],
        interview_time: '14:00:00',
        team_id: teamId,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Interview creation failed:', error.message);
      return null;
    }

    console.log('✅ Interview created successfully:', data.interview_id);
    console.log('   Type:', data.interview_type);
    console.log('   Mode:', data.interview_mode);
    console.log('   Date:', data.interview_date);
    return data;
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return null;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Form Testing\n');
  console.log('='.repeat(60));

  // Check if we have valid Supabase credentials
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials. Please set environment variables:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  // Sign in with test credentials
  console.log('🔐 Signing in with test credentials...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'test.swagath@gmail.com',
    password: '12345678',
  });

  if (signInError || !signInData.user) {
    console.error('❌ Failed to sign in:', signInError?.message || 'Unknown error');
    console.error('   Please check the credentials and try again.');
    process.exit(1);
  }

  console.log('✅ Signed in successfully as:', signInData.user.email);

  // Get the current user and team
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('❌ Not authenticated. Please log in first.');
    console.error('   This script requires an authenticated session.');
    process.exit(1);
  }

  // Get user details
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('user_id, team_id, username, email')
    .eq('email', user.email)
    .single();

  if (userError || !userData) {
    console.error('❌ Could not find user data');
    process.exit(1);
  }

  const userId = userData.user_id;
  const teamId = userData.team_id;

  console.log('👤 Running tests as:', userData.username, `(${userData.email})`);
  console.log('🏢 Team ID:', teamId);
  console.log('='.repeat(60));

  // Get a visa status for testing
  const { data: visaStatuses, error: visaError } = await supabase
    .from('visa_status')
    .select('visa_status_id, visa_name')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (visaError || !visaStatuses) {
    console.error('❌ Could not find visa status. Make sure the database is seeded.');
    process.exit(1);
  }

  console.log('📄 Using visa status:', visaStatuses.visa_name);
  console.log('='.repeat(60));

  // Run all tests in sequence
  const candidate = await testCandidateCreation(teamId, userId, visaStatuses.visa_status_id);
  if (!candidate) {
    console.log('\n⚠️  Stopping tests due to candidate creation failure');
    return;
  }

  const client = await testClientCreation(teamId, userId);
  if (!client) {
    console.log('\n⚠️  Stopping tests due to client creation failure');
    return;
  }

  const vendor = await testVendorCreation(teamId, userId);
  if (!vendor) {
    console.log('\n⚠️  Stopping tests due to vendor creation failure');
    return;
  }

  const requirement = await testRequirementCreation(teamId, userId, client.client_id);
  if (!requirement) {
    console.log('\n⚠️  Stopping tests due to requirement creation failure');
    return;
  }

  const submission = await testSubmissionCreation(
    teamId,
    userId,
    candidate.candidate_id,
    requirement.requirement_id,
    vendor.vendor_id
  );
  if (!submission) {
    console.log('\n⚠️  Stopping tests due to submission creation failure');
    return;
  }

  const interview = await testInterviewCreation(teamId, userId, submission.submission_id);
  if (!interview) {
    console.log('\n⚠️  Stopping tests due to interview creation failure');
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All Tests Completed Successfully!');
  console.log('='.repeat(60));
  console.log('\n📊 Summary:');
  console.log(`   Candidate: ${candidate.first_name} ${candidate.last_name} (${candidate.candidate_id})`);
  console.log(`   Client: ${client.client_name} (${client.client_id})`);
  console.log(`   Vendor: ${vendor.vendor_name} (${vendor.vendor_id})`);
  console.log(`   Requirement: ${requirement.job_title} (${requirement.requirement_id})`);
  console.log(`   Submission: ${submission.submission_id}`);
  console.log(`   Interview: ${interview.interview_id}`);
  console.log('\n🎉 You can now verify these records in the application UI!');
}

// Run the tests
runAllTests().catch(console.error);
