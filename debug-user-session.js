#!/usr/bin/env node

/**
 * Debug User Session Issue
 * Check if the user test.swagath@gmail.com exists in auth and public.users
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

async function checkUserSession() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 DEBUGGING USER SESSION ISSUE');
  console.log('='.repeat(80));

  console.log('\n📧 Looking for user: test.swagath@gmail.com\n');

  try {
    // Check if user exists in public.users
    console.log('1️⃣  Checking public.users table...');
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('id, email, team_id, role_id, is_master_admin, created_at')
      .eq('email', 'test.swagath@gmail.com');

    if (publicError) {
      console.error('   ❌ Error querying users:', publicError.message);
    } else if (!publicUsers || publicUsers.length === 0) {
      console.log('   ❌ User NOT found in public.users');
    } else {
      console.log(`   ✅ User found in public.users:`);
      publicUsers.forEach(user => {
        console.log(`      ID: ${user.id}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Team ID: ${user.team_id || 'NULL'}`);
        console.log(`      Role ID: ${user.role_id || 'NULL'}`);
        console.log(`      Is Master Admin: ${user.is_master_admin}`);
        console.log(`      Created: ${user.created_at}`);
      });
    }

    // Check auth.users (via admin API)
    console.log('\n2️⃣  Checking auth.users via admin API...');
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('   ❌ Error listing auth users:', authError.message);
    } else {
      const testUser = authUsers.find(u => u.email === 'test.swagath@gmail.com');
      if (!testUser) {
        console.log('   ❌ User NOT found in auth.users');
        console.log(`   Available users (${authUsers.length} total):`);
        authUsers.slice(0, 5).forEach(u => {
          console.log(`      - ${u.email} (${u.id})`);
        });
      } else {
        console.log(`   ✅ User found in auth.users:`);
        console.log(`      ID: ${testUser.id}`);
        console.log(`      Email: ${testUser.email}`);
        console.log(`      Email Confirmed: ${testUser.email_confirmed_at ? 'YES' : 'NO'}`);
        console.log(`      Created: ${testUser.created_at}`);
      }
    }

    // Check for data mismatch
    console.log('\n3️⃣  Checking for auth ↔ public.users mismatch...');

    if (publicUsers && publicUsers.length > 0 && authUsers) {
      const pubUser = publicUsers[0];
      const authUser = authUsers.find(u => u.email === 'test.swagath@gmail.com');

      if (authUser) {
        if (pubUser.id === authUser.id) {
          console.log('   ✅ IDs match between auth and public.users');
        } else {
          console.log(`   ❌ ID MISMATCH!`);
          console.log(`      public.users.id: ${pubUser.id}`);
          console.log(`      auth.users.id:    ${authUser.id}`);
        }
      }
    }

    // Check all users for debugging
    console.log('\n4️⃣  All users in database:\n');

    const { data: allUsers } = await supabase
      .from('users')
      .select('id, email, team_id, role_id, is_master_admin')
      .limit(20);

    if (allUsers && allUsers.length > 0) {
      console.log(`   Found ${allUsers.length} users:`);
      allUsers.forEach(u => {
        const indicator = u.email === 'test.swagath@gmail.com' ? '👈 TARGET' : '';
        console.log(`   - ${u.email.padEnd(35)} team=${u.team_id ? u.team_id.substring(0, 8) : 'NULL'.padEnd(8)} ${indicator}`);
      });
    } else {
      console.log('   ❌ No users found');
    }

  } catch (error) {
    console.error('Fatal error:', error.message);
  }

  console.log('\n' + '='.repeat(80));
}

checkUserSession();
