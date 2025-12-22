#!/usr/bin/env node
/**
 * Database Introspection - Check current schema
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://awujhuncfghjshggkqyo.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: 'public' }
});

async function checkDatabase() {
  console.log('='.repeat(80));
  console.log('DATABASE SCHEMA INTROSPECTION');
  console.log('='.repeat(80));
  console.log();

  // Check for critical tables
  const tables = [
    'users',
    'teams',
    'roles',
    'candidates',
    'team_memberships',
    'team_settings',
  ];

  console.log('Checking for critical tables:');
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);

      if (error && error.message.includes('does not exist')) {
        console.log(`  ❌ ${table.padEnd(25)} NOT FOUND`);
      } else if (error) {
        console.log(`  ⚠️  ${table.padEnd(25)} ERROR: ${error.message}`);
      } else {
        console.log(`  ✅ ${table.padEnd(25)} exists`);
      }
    } catch (err) {
      console.log(`  ⚠️  ${table.padEnd(25)} EXCEPTION: ${err.message}`);
    }
  }

  console.log();
  console.log('Checking for RLS functions:');

  // Try querying with RLS-related checks
  try {
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, team_id, is_master_admin')
      .limit(1);

    if (!usersError) {
      console.log('  ✅ users table structure: id, email, team_id, is_master_admin');
      console.log(`     Sample user count: ${usersData ? usersData.length : 0}`);
    } else {
      console.log(`  ⚠️  Error querying users: ${usersError.message}`);
    }
  } catch (err) {
    console.log(`  ⚠️  Exception querying users: ${err.message}`);
  }

  console.log();
  console.log('KEY FINDINGS:');
  console.log('- team_memberships table is REQUIRED for Multi-Tenant v2');
  console.log('- Without it, pending user isolation cannot be tested');
  console.log('- RLS policies depend on team_memberships table and helper functions');
}

checkDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
