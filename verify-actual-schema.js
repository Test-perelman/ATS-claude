#!/usr/bin/env node

/**
 * Verify Actual Database Schema
 * Get the EXACT column names from Supabase
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifySchema() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ACTUAL DATABASE SCHEMA VERIFICATION');
  console.log('='.repeat(80));

  try {
    // Try to insert and see what columns exist
    console.log('\n1️⃣  Testing candidates table structure...');

    const { data, error } = await supabase
      .from('candidates')
      .insert({
        team_id: '11111111-1111-1111-1111-111111111111',
        first_name: 'Test',
        last_name: 'User',
        email: `test_${Date.now()}@test.com`,
        status: 'new',
      })
      .select('*')
      .single();

    if (error) {
      console.log('❌ Insert error:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Details:', error.details);
    } else {
      console.log('✅ Insert succeeded!');
      console.log('\n   Actual columns returned:');
      Object.keys(data).forEach(key => {
        console.log(`      ${key}: ${typeof data[key]} = ${JSON.stringify(data[key]).substring(0, 50)}`);
      });
    }

    // Query existing candidate to see structure
    console.log('\n2️⃣  Checking existing candidate structure...');
    const { data: existing, error: queryError } = await supabase
      .from('candidates')
      .select('*')
      .limit(1)
      .single();

    if (!queryError && existing) {
      console.log('✅ Existing candidate found');
      console.log('\n   Actual columns in existing record:');
      Object.keys(existing).forEach(key => {
        const value = existing[key];
        console.log(`      - ${key}: ${typeof value}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

verifySchema();
