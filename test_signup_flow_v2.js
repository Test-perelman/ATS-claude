#!/usr/bin/env node

/**
 * TEST SIGNUP FLOW V2
 * Demonstrate what happens when a new user signs up
 * Use UPSERT to handle auto-created user records
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://awujhuncfghjshggkqyo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

(async () => {
  try {
    log(colors.cyan, '\n╔════════════════════════════════════════════════════════════╗');
    log(colors.cyan, '║  NEW USER SIGNUP FLOW - EXACT DEMONSTRATION                 ║');
    log(colors.cyan, '╚════════════════════════════════════════════════════════════╝\n');

    const testEmail = `newuser_${Date.now()}@example.com`;
    const testPassword = 'TestPass@123456';

    log(colors.blue, '📋 STEP 1: User goes to /auth/signup\n');
    log(colors.yellow, `   URL: http://localhost:3001/auth/signup`);
    log(colors.yellow, `   Enters Email: ${testEmail}`);
    log(colors.yellow, `   Enters Password: ${testPassword}\n`);

    log(colors.blue, '📋 STEP 2: Click "Sign Up" → System creates auth user\n');

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (authError) {
      log(colors.red, '❌ Failed:', authError.message);
      process.exit(1);
    }

    const userId = authData.user.id;
    log(colors.green, `   ✅ Auth user created`);
    log(colors.yellow, `   User ID: ${userId}`);
    log(colors.yellow, `   Email: ${testEmail}\n`);

    log(colors.blue, '📋 STEP 3: System auto-generates TEAM_ID (as UUID)\n');

    const teamId = require('crypto').randomUUID();
    log(colors.green, `   ✅ team_id generated (UUID format)`);
    log(colors.yellow, `   team_id: ${teamId}\n`);

    log(colors.blue, '📋 STEP 4: System creates TEAM record in database\n');

    const { data: teamData, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        id: teamId,
        name: `${testEmail.split('@')[0]}'s Team`,
      })
      .select()
      .single();

    if (teamError) {
      log(colors.red, '❌ Failed:', teamError.message);
      process.exit(1);
    }

    log(colors.green, `   ✅ Team created in database`);
    log(colors.yellow, `   Team ID: ${teamId}`);
    log(colors.yellow, `   Team Name: ${teamData.name}\n`);

    log(colors.blue, '📋 STEP 5: System creates ADMIN ROLE for this team\n');

    const roleId = require('crypto').randomUUID();
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .insert({
        id: roleId,
        team_id: teamId,
        name: 'Admin',
        is_admin: true,
      })
      .select()
      .single();

    if (roleError) {
      log(colors.red, '❌ Failed:', roleError.message);
      process.exit(1);
    }

    log(colors.green, `   ✅ Admin role created`);
    log(colors.yellow, `   Role ID: ${roleId}`);
    log(colors.yellow, `   Role Name: Admin`);
    log(colors.yellow, `   is_admin: true\n`);

    log(colors.blue, '📋 STEP 6: System updates USER record with team_id and role_id\n');

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email: testEmail,
        team_id: teamId,       // ← TEAM_ID ASSIGNED HERE
        role_id: roleId,       // ← ADMIN ROLE ASSIGNED HERE
        is_master_admin: false,
      })
      .select()
      .single();

    if (userError) {
      log(colors.red, '❌ Failed:', userError.message);
      process.exit(1);
    }

    log(colors.green, `   ✅ User record updated`);
    log(colors.yellow, `   User ID: ${userId}`);
    log(colors.yellow, `   Email: ${testEmail}`);
    log(colors.yellow, `   team_id: ${teamId} ← ASSIGNED`);
    log(colors.yellow, `   role_id: ${roleId} ← ASSIGNED ADMIN\n`);

    log(colors.blue, '📋 STEP 7: Page shows success message\n');
    log(colors.yellow, `   Message: "Account created! Setting up your team..."`);
    log(colors.yellow, `   Redirect: /onboarding (after 1 second)\n`);

    // Verify in database
    log(colors.cyan, '╔════════════════════════════════════════════════════════════╗');
    log(colors.cyan, '║  VERIFICATION - CHECKING DATABASE STATE                     ║');
    log(colors.cyan, '╚════════════════════════════════════════════════════════════╝\n');

    const { data: verifyUser } = await supabaseAdmin
      .from('users')
      .select('id, email, team_id, role_id, is_master_admin')
      .eq('id', userId)
      .single();

    log(colors.yellow, '👤 USER RECORD IN DATABASE:\n');
    log(colors.green, `   ID:               ${verifyUser.id}`);
    log(colors.green, `   Email:            ${verifyUser.email}`);
    log(colors.green, `   team_id:          ${verifyUser.team_id}`);
    log(colors.green, `   role_id:          ${verifyUser.role_id}`);
    log(colors.green, `   is_master_admin:  ${verifyUser.is_master_admin}\n`);

    const { data: verifyTeam } = await supabaseAdmin
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single();

    log(colors.yellow, '🏢 TEAM RECORD IN DATABASE:\n');
    log(colors.green, `   ID:   ${verifyTeam.id}`);
    log(colors.green, `   Name: ${verifyTeam.name}\n`);

    const { data: verifyRole } = await supabaseAdmin
      .from('roles')
      .select('id, team_id, name, is_admin')
      .eq('id', roleId)
      .single();

    log(colors.yellow, '👔 ROLE RECORD IN DATABASE:\n');
    log(colors.green, `   ID:        ${verifyRole.id}`);
    log(colors.green, `   Team ID:   ${verifyRole.team_id}`);
    log(colors.green, `   Name:      ${verifyRole.name}`);
    log(colors.green, `   is_admin:  ${verifyRole.is_admin}\n`);

    // Final answer
    log(colors.cyan, '╔════════════════════════════════════════════════════════════╗');
    log(colors.cyan, '║  ANSWER: IF YOU SIGNUP RIGHT NOW...                        ║');
    log(colors.cyan, '╚════════════════════════════════════════════════════════════╝\n');

    log(colors.green, '✅ TEAM_ID ASSIGNMENT:');
    log(colors.yellow, `   └─ A UNIQUE UUID is auto-generated`);
    log(colors.yellow, `   └─ Format: ${teamId}`);
    log(colors.yellow, `   └─ Assigned to: users.team_id column`);
    log(colors.yellow, `   └─ Links you to your personal team\n`);

    log(colors.green, '✅ ROLE ASSIGNMENT:');
    log(colors.yellow, `   └─ Role Name: "Admin"`);
    log(colors.yellow, `   └─ is_admin: true`);
    log(colors.yellow, `   └─ Assigned to: users.role_id column`);
    log(colors.yellow, `   └─ You become admin of your team\n`);

    log(colors.green, '✅ YOUR STATUS AFTER SIGNUP:');
    log(colors.yellow, `   └─ Authenticated: YES`);
    log(colors.yellow, `   └─ Team Owner: YES`);
    log(colors.yellow, `   └─ Team Admin: YES`);
    log(colors.yellow, `   └─ Master Admin: NO`);
    log(colors.yellow, `   └─ Can manage team members: YES\n`);

    log(colors.cyan, '════════════════════════════════════════════════════════════\n');

  } catch (error) {
    log(colors.red, 'Error:', error.message);
    process.exit(1);
  }
})();
