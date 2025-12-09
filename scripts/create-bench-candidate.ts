/**
 * Create a test candidate with on_bench status
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

async function createBenchCandidate() {
  console.log('🚀 Creating test candidate with on_bench status\n');

  // Sign in
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'test.swagath@gmail.com',
    password: '12345678',
  });

  if (signInError || !signInData.user) {
    console.error('❌ Failed to sign in');
    process.exit(1);
  }

  console.log('✅ Signed in as:', signInData.user.email);

  // Get user details
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('user_id, team_id, username')
    .eq('email', signInData.user.email)
    .single();

  if (userError || !userData) {
    console.error('❌ Could not find user data');
    process.exit(1);
  }

  // Get visa status
  const { data: visaStatus } = await supabase
    .from('visa_status')
    .select('visa_status_id')
    .eq('is_active', true)
    .limit(1)
    .single();

  // Create candidate
  const { data, error } = await supabase
    .from('candidates')
    .insert({
      first_name: 'Sarah',
      last_name: 'BenchTest',
      email_address: `sarah.benchtest.${Date.now()}@example.com`,
      phone_number: '555-9999',
      linkedin_url: 'https://www.linkedin.com/in/sarahbenchtest',
      current_location: 'Austin, TX',
      relocation_preference: 'Open to relocation',
      visa_status_id: visaStatus?.visa_status_id || null,
      total_experience_years: 5,
      skills_primary: 'React, Node.js, TypeScript, MongoDB, GraphQL',
      skills_secondary: 'AWS, Docker, Kubernetes, CI/CD',
      preferred_roles: 'Frontend Developer, Full Stack Developer',
      hourly_pay_rate: 75.00,
      salary_annual: 140000,
      bench_status: 'on_bench', // Important: on_bench status
      bench_added_date: new Date().toISOString().split('T')[0],
      notes_internal: 'Test candidate for bench page validation. Strong frontend skills.',
      team_id: userData.team_id,
      created_by: userData.user_id,
      updated_by: userData.user_id,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to create candidate:', error.message);
    process.exit(1);
  }

  console.log('\n✅ Candidate created successfully!');
  console.log('   ID:', data.candidate_id);
  console.log('   Name:', `${data.first_name} ${data.last_name}`);
  console.log('   Email:', data.email_address);
  console.log('   Bench Status:', data.bench_status);
  console.log('   Bench Since:', data.bench_added_date);
  console.log('   Location:', data.current_location);
  console.log('\n🎉 Check the bench page at http://localhost:3001/bench');
}

createBenchCandidate().catch(console.error);
