#!/usr/bin/env node

/**
 * VERIFY SETUP
 * Verify that the 3 users and team are correctly set up in database
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
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

(async () => {
  try {
    log(colors.cyan, '\n═══════════════════════════════════════════');
    log(colors.cyan, '  VERIFY SETUP');
    log(colors.cyan, '═══════════════════════════════════════════\n');

    // Get all users
    const { data: users } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        team_id,
        role_id,
        is_master_admin,
        role:roles(id, name, is_admin),
        team:teams(id, name)
      `);

    log(colors.yellow, `Found ${users?.length || 0} users:\n`);

    users?.forEach((user, idx) => {
      log(colors.green, `${idx + 1}. ${user.email}`);
      log(colors.yellow, `   Team: ${user.team?.name || '(None)'}`);
      log(colors.yellow, `   Role: ${user.role?.name || '(None)'}`);
      log(colors.yellow, `   Master Admin: ${user.is_master_admin}`);
      log(colors.yellow, ``);
    });

    // Get teams
    const { data: teams } = await supabaseAdmin
      .from('teams')
      .select('*');

    log(colors.yellow, `\nTeams: ${teams?.length || 0}\n`);
    teams?.forEach(team => {
      log(colors.green, `  • ${team.name}`);
    });

    // Get team memberships
    const { data: memberships } = await supabaseAdmin
      .from('team_memberships')
      .select('*');

    log(colors.yellow, `\nTeam Memberships: ${memberships?.length || 0}\n`);

    log(colors.cyan, '═══════════════════════════════════════════\n');
  } catch (error) {
    log(colors.red, 'Error:', error.message);
  }
})();
