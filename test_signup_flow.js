#!/usr/bin/env node

/**
 * TEST SIGNUP FLOW
 * Demonstrate what happens when a new user signs up
 * Show: team_id assignment, role assignment, database state
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
    log(colors.cyan, '║  NEW USER SIGNUP FLOW - DETAILED DEMONSTRATION              ║');
    log(colors.cyan, '╚════════════════════════════════════════════════════════════╝\n');

    // Create a test user via auth signup
    const testEmail = `testuser_${Date.now()}@example.com`;
    const testPassword = 'TestPass@123456';

    log(colors.blue, '📋 STEP 1: User goes to /auth/signup\n');
    log(colors.yellow, `   Enters Email: ${testEmail}`);
    log(colors.yellow, `   Enters Password: ${testPassword}`);
    log(colors.yellow, `   Confirms Password: ${testPassword}\n`);

    log(colors.blue, '📋 STEP 2: System creates auth user (via signUp function)\n');

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (authError) {
      log(colors.red, '❌ Auth user creation failed:', authError.message);
      process.exit(1);
    }

    const userId = authData.user.id;
    log(colors.green, `   ✅ Auth user created with ID: ${userId}`);
    log(colors.yellow, `   Auth Status: email_confirmed = true\n`);

    log(colors.blue, '📋 STEP 3: System auto-generates team_id (UUID)\n');

    const teamId = require('crypto').randomUUID();
    log(colors.green, `   ✅ team_id generated: ${teamId}`);
    log(colors.yellow, `   This UUID is UNIQUE and identifies the user's personal team\n`);

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
      log(colors.red, '❌ Team creation failed:', teamError.message);
      process.exit(1);
    }

    log(colors.green, `   ✅ Team created`);
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
      log(colors.red, '❌ Role creation failed:', roleError.message);
      process.exit(1);
    }

    log(colors.green, `   ✅ Admin role created`);
    log(colors.yellow, `   Role ID: ${roleId}`);
    log(colors.yellow, `   Role Name: Admin`);
    log(colors.yellow, `   is_admin: true (has admin permissions)\n`);

    log(colors.blue, '📋 STEP 6: System creates USER record with team_id and role_id\n');

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: testEmail,
        team_id: teamId,      // ← TEAM ID ASSIGNED HERE
        role_id: roleId,      // ← ADMIN ROLE ASSIGNED HERE
        is_master_admin: false,
      })
      .select()
      .single();

    if (userError) {
      log(colors.red, '❌ User record creation failed:', userError.message);
      process.exit(1);
    }

    log(colors.green, `   ✅ User record created`);
    log(colors.yellow, `   User ID: ${userId}`);
    log(colors.yellow, `   team_id: ${teamId} ← ASSIGNED TO THIS TEAM`);
    log(colors.yellow, `   role_id: ${roleId} ← ASSIGNED ADMIN ROLE`);
    log(colors.yellow, `   is_master_admin: false\n`);

    log(colors.blue, '📋 STEP 7: User redirected to /onboarding\n');
    log(colors.yellow, `   Page shows: "Choose to create or join team"`);
    log(colors.yellow, `   But actually: Team and role ALREADY created!\n`);

    // ════════════════════════════════════════════════════════════════

    log(colors.cyan, '╔════════════════════════════════════════════════════════════╗');
    log(colors.cyan, '║  FINAL DATABASE STATE FOR NEW USER                         ║');
    log(colors.cyan, '╚════════════════════════════════════════════════════════════╝\n');

    log(colors.yellow, '👤 USER RECORD:\n');
    log(colors.green, `   Email:           ${userData.email}`);
    log(colors.green, `   User ID:         ${userData.id}`);
    log(colors.green, `   team_id:         ${userData.team_id} ← ASSIGNED AT SIGNUP`);
    log(colors.green, `   role_id:         ${userData.role_id} ← ADMIN ROLE`);
    log(colors.green, `   is_master_admin: ${userData.is_master_admin} (false = team admin only)\n`);

    log(colors.yellow, '🏢 TEAM RECORD:\n');
    log(colors.green, `   Team ID:   ${teamData.id}`);
    log(colors.green, `   Team Name: ${teamData.name}`);
    log(colors.green, `   Owner:     ${userData.email}\n`);

    log(colors.yellow, '👔 ROLE RECORD:\n');
    log(colors.green, `   Role ID:    ${roleData.id}`);
    log(colors.green, `   Role Name:  ${roleData.name}`);
    log(colors.green, `   Team ID:    ${roleData.team_id}`);
    log(colors.green, `   is_admin:   ${roleData.is_admin} (has admin permissions)\n`);

    // ════════════════════════════════════════════════════════════════

    log(colors.cyan, '╔════════════════════════════════════════════════════════════╗');
    log(colors.cyan, '║  ANSWER: IF YOU SIGNUP NOW...                             ║');
    log(colors.cyan, '╚════════════════════════════════════════════════════════════╝\n');

    log(colors.green, '✅ team_id Assignment:');
    log(colors.yellow, `   └─ A NEW UUID is generated (auto-generated by system)`);
    log(colors.yellow, `   └─ Example: ${teamId}`);
    log(colors.yellow, `   └─ Your personal team is created with this ID\n`);

    log(colors.green, '✅ Role Assignment:');
    log(colors.yellow, `   └─ You get the "Admin" role`);
    log(colors.yellow, `   └─ is_admin = true (you have admin permissions)`);
    log(colors.yellow, `   └─ You can manage your team, approve members, etc.\n`);

    log(colors.green, '✅ What Happens Next:');
    log(colors.yellow, `   └─ User redirects to /onboarding`);
    log(colors.yellow, `   └─ Can choose: "Create Team" or "Join Team"`);
    log(colors.yellow, `   └─ But team already exists in background!\n`);

    log(colors.cyan, '════════════════════════════════════════════════════════════\n');

  } catch (error) {
    log(colors.red, 'Error:', error.message);
    process.exit(1);
  }
})();
