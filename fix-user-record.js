#!/usr/bin/env node

/**
 * Manual User Record Creation
 * Creates the missing public.users record for test.swagath@gmail.com
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUserRecord() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIXING MISSING USER RECORD');
  console.log('='.repeat(80));

  try {
    // Get the auth user
    console.log('\n1️⃣  Getting auth user...');
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
    const authUser = authUsers.find(u => u.email === 'test.swagath@gmail.com');

    if (!authUser) {
      console.error('❌ Auth user not found');
      process.exit(1);
    }

    console.log(`✅ Found auth user: ${authUser.id}`);

    // Get a team to assign the user to
    console.log('\n2️⃣  Getting a team...');
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .limit(1);

    if (!teams || teams.length === 0) {
      console.error('❌ No teams found');
      process.exit(1);
    }

    const teamId = teams[0].id;
    console.log(`✅ Using team: ${teamId} (${teams[0].name})`);

    // Get the Local Admin role for this team
    console.log('\n3️⃣  Getting Local Admin role for team...');
    const { data: roles } = await supabase
      .from('roles')
      .select('id, name, is_admin')
      .eq('team_id', teamId)
      .eq('is_admin', true)
      .limit(1);

    if (!roles || roles.length === 0) {
      console.error('❌ No admin role found for team');
      process.exit(1);
    }

    const roleId = roles[0].id;
    console.log(`✅ Using role: ${roleId} (${roles[0].name})`);

    // Create user record
    console.log('\n4️⃣  Creating user record in public.users...');
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: authUser.id,  // CRITICAL: Must match auth.users.id
        email: authUser.email.toLowerCase(),
        team_id: teamId,
        role_id: roleId,
        is_master_admin: false,
      })
      .select('id, email, team_id, role_id, is_master_admin')
      .single();

    if (createError) {
      console.error('❌ Error creating user:', createError.message);
      process.exit(1);
    }

    console.log(`✅ User record created successfully!`);
    console.log(`\n   ID: ${newUser.id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Team ID: ${newUser.team_id}`);
    console.log(`   Role ID: ${newUser.role_id}`);
    console.log(`   Is Master Admin: ${newUser.is_master_admin}`);

    console.log('\n✅ User can now log in and create records!');

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

fixUserRecord();
