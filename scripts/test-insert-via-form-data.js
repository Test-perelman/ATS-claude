#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  console.log('Testing insert with FORM DATA (camelCase)...\n');

  const formData = {
    firstName: 'Test',
    lastName: 'User',
    email: `test.${Date.now()}@test.com`,
    phone: '555-1234',
    currentLocation: 'NYC',
    currentTitle: 'Developer',
    currentCompany: 'Test Inc',
    experienceYears: 5,
    skills: [],
    status: 'new',
  };

  console.log('Form data to insert:', JSON.stringify(formData, null, 2));

  const { data, error } = await supabase
    .from('candidates')
    .insert({
      team_id: '11111111-1111-1111-1111-111111111111',
      // Try to map camelCase to snake_case
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      location: formData.currentLocation,
      current_title: formData.currentTitle,
      current_employer: formData.currentCompany,
      experience_years: formData.experienceYears,
      skills: formData.skills,
      status: formData.status,
      created_by: '5b935ada-e66e-4495-9e17-fa79d59c30c6',
    })
    .select();

  if (error) {
    console.error('❌ INSERT FAILED:');
    console.error('  Error:', error.message);
    console.error('  Code:', error.code);
    console.error('  Details:', error);
    process.exit(1);
  }

  console.log('✅ INSERT SUCCESS!');
  console.log('Inserted:', JSON.stringify(data[0], null, 2));
}

test().catch(console.error);
