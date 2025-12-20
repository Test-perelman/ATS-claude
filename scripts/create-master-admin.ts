#!/usr/bin/env node

/**
 * Create Master Admin Script
 * Usage: npx ts-node scripts/create-master-admin.ts
 *
 * Creates a master admin user with full system access
 */

import { createAdminClient } from '../src/lib/supabase/server';

async function createMasterAdmin() {
  // Get environment variables
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗');
    process.exit(1);
  }

  // Get input from command line
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.log(`
Usage: npx ts-node scripts/create-master-admin.ts <email> <password> <firstName> <lastName>

Examples:
  npx ts-node scripts/create-master-admin.ts admin@example.com password123 Admin User
  npx ts-node scripts/create-master-admin.ts master@company.com SecurePass123 Master Admin

This creates a master admin user with full system access.
    `);
    process.exit(1);
  }

  const [email, password, firstName, lastName] = args;

  console.log('Creating master admin user...');
  console.log('Email:', email);
  console.log('Name:', `${firstName} ${lastName}`);
  console.log('');

  try {
    // Create admin client
    const supabase = await createAdminClient();

    // Step 1: Create Supabase auth user
    console.log('Step 1: Creating Supabase auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (authError || !authData.user) {
      console.error('❌ Auth user creation failed:', authError?.message);
      process.exit(1);
    }

    const userId = authData.user.id;
    console.log('✓ Auth user created:', userId);
    console.log('');

    // Step 2: Create user record as master admin
    console.log('Step 2: Creating master admin user record...');
    const { data: userData, error: userError } = await (supabase.from('users') as any)
      .insert({
        user_id: userId,
        email,
        username: email.split('@')[0],
        first_name: firstName,
        last_name: lastName,
        is_master_admin: true,
        team_id: null,
        role_id: null,
        status: 'active',
      })
      .select()
      .single();

    if (userError || !userData) {
      console.error('❌ User record creation failed:', userError?.message);
      // Attempt cleanup
      console.log('Cleaning up auth user...');
      await supabase.auth.admin.deleteUser(userId);
      process.exit(1);
    }

    console.log('✓ Master admin user record created');
    console.log('');
    console.log('✅ Master admin created successfully!');
    console.log('');
    console.log('Login details:');
    console.log('  Email:', email);
    console.log('  Password:', password);
    console.log('');
    console.log('⚠️  Important: Change the password after first login!');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

createMasterAdmin();
