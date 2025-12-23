#!/usr/bin/env node

/**
 * CLEANUP & SETUP SCRIPT V3
 *
 * Uses UPSERT to handle auto-created user records from auth
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
    log(colors.cyan, '\n═══════════════════════════════════════════════════════════');
    log(colors.cyan, '  CLEANUP & FRESH SETUP V3');
    log(colors.cyan, '═══════════════════════════════════════════════════════════\n');

    // STEP 1: DELETE ALL EXISTING DATA
    log(colors.blue, '📋 STEP 1: Deleting all existing data...\n');

    log(colors.blue, '   Deleting team memberships...');
    await supabaseAdmin
      .from('team_memberships')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    log(colors.green, '   ✅ Done');

    log(colors.blue, '   Deleting candidates...');
    await supabaseAdmin
      .from('candidates')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    log(colors.green, '   ✅ Done');

    log(colors.blue, '   Deleting users...');
    await supabaseAdmin
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    log(colors.green, '   ✅ Done');

    log(colors.blue, '   Deleting roles...');
    await supabaseAdmin
      .from('roles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    log(colors.green, '   ✅ Done');

    log(colors.blue, '   Deleting teams...');
    await supabaseAdmin
      .from('teams')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    log(colors.green, '   ✅ Done');

    log(colors.blue, '   Deleting auth users...');
    const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers();
    for (const user of authUsers) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
    }
    log(colors.green, `   ✅ Deleted ${authUsers.length} auth users`);

    // STEP 2: CREATE FRESH USERS
    log(colors.blue, '\n📋 STEP 2: Creating fresh users...\n');

    const credentials = {
      regular: {
        email: 'user@example.com',
        password: 'User@123456',
      },
      admin: {
        email: 'admin@example.com',
        password: 'Admin@123456',
      },
      master: {
        email: 'master@example.com',
        password: 'Master@123456',
      },
    };

    // Create Team
    log(colors.blue, '   Creating team...');
    const { data: teamData, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({ name: 'Sample Team' })
      .select()
      .single();

    if (teamError) {
      log(colors.red, '❌ Team creation failed:', teamError.message);
      process.exit(1);
    }

    const teamId = teamData.id;
    log(colors.green, `   ✅ Team created`);

    // Create roles
    log(colors.blue, '   Creating roles...');

    const { data: ownerRole } = await supabaseAdmin
      .from('roles')
      .insert({
        team_id: teamId,
        name: 'Owner',
        is_admin: true,
      })
      .select()
      .single();

    const { data: memberRole } = await supabaseAdmin
      .from('roles')
      .insert({
        team_id: teamId,
        name: 'Member',
        is_admin: false,
      })
      .select()
      .single();

    log(colors.green, `   ✅ Roles created`);

    // 1. CREATE REGULAR USER
    log(colors.blue, '\n   Creating regular user...');
    const { data: regularAuthData, error: regularAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: credentials.regular.email,
      password: credentials.regular.password,
      email_confirm: true,
    });

    if (regularAuthError) {
      log(colors.red, '❌ Failed:', regularAuthError.message);
    } else {
      const regularUserId = regularAuthData.user.id;

      // UPSERT user record (update if exists, insert if not)
      const { error: regularUserError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: regularUserId,
          email: credentials.regular.email,
          team_id: teamId,
          role_id: memberRole.id,
          is_master_admin: false,
        });

      if (regularUserError) {
        log(colors.red, '❌ Failed:', regularUserError.message);
      } else {
        await supabaseAdmin
          .from('team_memberships')
          .insert({
            user_id: regularUserId,
            team_id: teamId,
            status: 'approved',
            requested_at: new Date().toISOString(),
            approved_at: new Date().toISOString(),
            approved_by: regularUserId,
            requested_role_id: memberRole.id,
          });

        log(colors.green, `   ✅ Regular user created: ${credentials.regular.email}`);
      }
    }

    // 2. CREATE TEAM ADMIN
    log(colors.blue, '\n   Creating team admin...');
    const { data: adminAuthData, error: adminAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: credentials.admin.email,
      password: credentials.admin.password,
      email_confirm: true,
    });

    if (adminAuthError) {
      log(colors.red, '❌ Failed:', adminAuthError.message);
    } else {
      const adminUserId = adminAuthData.user.id;

      const { error: adminUserError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: adminUserId,
          email: credentials.admin.email,
          team_id: teamId,
          role_id: ownerRole.id,
          is_master_admin: false,
        });

      if (adminUserError) {
        log(colors.red, '❌ Failed:', adminUserError.message);
      } else {
        await supabaseAdmin
          .from('team_memberships')
          .insert({
            user_id: adminUserId,
            team_id: teamId,
            status: 'approved',
            requested_at: new Date().toISOString(),
            approved_at: new Date().toISOString(),
            approved_by: adminUserId,
            requested_role_id: ownerRole.id,
          });

        log(colors.green, `   ✅ Team admin created: ${credentials.admin.email}`);
      }
    }

    // 3. CREATE MASTER ADMIN
    log(colors.blue, '\n   Creating master admin...');
    const { data: masterAuthData, error: masterAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: credentials.master.email,
      password: credentials.master.password,
      email_confirm: true,
    });

    if (masterAuthError) {
      log(colors.red, '❌ Failed:', masterAuthError.message);
    } else {
      const masterUserId = masterAuthData.user.id;

      const { error: masterUserError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: masterUserId,
          email: credentials.master.email,
          team_id: null,
          role_id: null,
          is_master_admin: true,
        });

      if (masterUserError) {
        log(colors.red, '❌ Failed:', masterUserError.message);
      } else {
        log(colors.green, `   ✅ Master admin created: ${credentials.master.email}`);
      }
    }

    // FINAL SUMMARY
    log(colors.cyan, '\n═══════════════════════════════════════════════════════════');
    log(colors.green, '✅ SETUP COMPLETE - USER CREDENTIALS');
    log(colors.cyan, '═══════════════════════════════════════════════════════════\n');

    log(colors.yellow, '👤 REGULAR USER (Team Member):');
    log(colors.yellow, `   Email: ${credentials.regular.email}`);
    log(colors.yellow, `   Password: ${credentials.regular.password}`);
    log(colors.yellow, `   Team: Sample Team`);
    log(colors.yellow, `   Role: Member\n`);

    log(colors.yellow, '👔 TEAM ADMIN:');
    log(colors.yellow, `   Email: ${credentials.admin.email}`);
    log(colors.yellow, `   Password: ${credentials.admin.password}`);
    log(colors.yellow, `   Team: Sample Team`);
    log(colors.yellow, `   Role: Owner (admin)\n`);

    log(colors.yellow, '🔐 MASTER ADMIN:');
    log(colors.yellow, `   Email: ${credentials.master.email}`);
    log(colors.yellow, `   Password: ${credentials.master.password}`);
    log(colors.yellow, `   Role: Master Admin (access all)\n`);

    log(colors.cyan, '═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    log(colors.red, '❌ ERROR:', error.message);
  }
})();
