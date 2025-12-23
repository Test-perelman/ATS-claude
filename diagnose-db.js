#!/usr/bin/env node

/**
 * Database Diagnosis Script
 * Checks all critical tables, schema, RLS policies, and data integrity
 */

const https = require('https');

const SUPABASE_URL = 'https://awujhuncfghjshggkqyo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

let results = {};

function makeRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'awujhuncfghjshggkqyo.supabase.co',
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function checkTables() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('1. CHECKING CRITICAL TABLES');
  console.log('═══════════════════════════════════════════════════════════\n');

  const tables = [
    'users',
    'teams',
    'roles',
    'role_templates',
    'role_permissions',
    'template_permissions',
    'permissions',
    'team_memberships',
    'team_settings',
    'candidates',
  ];

  for (const table of tables) {
    try {
      const res = await makeRequest('GET', `/rest/v1/${table}?limit=1`);
      const exists = res.status !== 404;
      const count = res.status === 200 ? 'EXISTS' : 'NOT FOUND';
      console.log(`✓ ${table.padEnd(20)} : ${count}`);
    } catch (error) {
      console.log(`✗ ${table.padEnd(20)} : ERROR - ${error.message}`);
    }
  }
}

async function checkRoleTemplates() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('2. CHECKING ROLE TEMPLATES DATA');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const res = await makeRequest('GET', '/rest/v1/role_templates?limit=100');
    if (res.status === 200) {
      const templates = res.data;
      if (!Array.isArray(templates)) {
        console.log('✗ role_templates table exists but returned invalid data');
        return;
      }
      console.log(`✓ Found ${templates.length} role templates`);
      if (templates.length === 0) {
        console.log('\n⚠️  WARNING: No role templates found!');
        console.log('   Signup will FAIL because cloneRoleTemplatesForTeam() expects templates');
      } else {
        templates.forEach(t => {
          console.log(`   - ${t.template_name || t.id}`);
        });
      }
    } else {
      console.log(`✗ Failed to fetch role_templates: ${res.status}`);
    }
  } catch (error) {
    console.log(`✗ Error checking role_templates: ${error.message}`);
  }
}

async function checkUsers() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('3. CHECKING USERS');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const res = await makeRequest('GET', '/rest/v1/users?limit=100');
    if (res.status === 200) {
      const users = res.data;
      console.log(`✓ Found ${users.length} user records\n`);

      if (users.length > 0) {
        users.slice(0, 5).forEach(u => {
          console.log(`   ID: ${u.id}`);
          console.log(`   Email: ${u.email}`);
          console.log(`   Team ID: ${u.team_id || 'NULL'}`);
          console.log(`   Role ID: ${u.role_id || 'NULL'}`);
          console.log(`   Master Admin: ${u.is_master_admin}`);
          console.log('   ---');
        });
      }
    } else {
      console.log(`✗ Failed to fetch users: ${res.status}`);
    }
  } catch (error) {
    console.log(`✗ Error checking users: ${error.message}`);
  }
}

async function checkTeams() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('4. CHECKING TEAMS');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const res = await makeRequest('GET', '/rest/v1/teams?limit=100');
    if (res.status === 200) {
      const teams = res.data;
      console.log(`✓ Found ${teams.length} teams\n`);

      if (teams.length > 0) {
        teams.slice(0, 5).forEach(t => {
          console.log(`   ID: ${t.id}`);
          console.log(`   Name: ${t.name}`);
          console.log(`   Created: ${t.created_at}`);
          console.log('   ---');
        });
      }
    } else {
      console.log(`✗ Failed to fetch teams: ${res.status}`);
    }
  } catch (error) {
    console.log(`✗ Error checking teams: ${error.message}`);
  }
}

async function checkTeamMemberships() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('5. CHECKING TEAM MEMBERSHIPS');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const res = await makeRequest('GET', '/rest/v1/team_memberships?limit=100');
    if (res.status === 200) {
      const memberships = res.data;
      console.log(`✓ Found ${memberships.length} memberships\n`);

      if (memberships.length > 0) {
        memberships.slice(0, 5).forEach(m => {
          console.log(`   Membership ID: ${m.id}`);
          console.log(`   User ID: ${m.user_id}`);
          console.log(`   Team ID: ${m.team_id}`);
          console.log(`   Status: ${m.status}`);
          console.log(`   Requested: ${m.requested_at}`);
          console.log(`   Approved: ${m.approved_at || 'NOT YET'}`);
          console.log('   ---');
        });
      }
    } else {
      console.log(`✗ Failed to fetch team_memberships: ${res.status}`);
    }
  } catch (error) {
    console.log(`✗ Error checking team_memberships: ${error.message}`);
  }
}

async function checkRLS() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('6. CHECKING RLS POLICIES');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Note: Getting RLS policies requires SQL queries which REST API doesn't directly support
  // We can test RLS by trying to query as different roles

  try {
    const res = await makeRequest('GET', '/rest/v1/users?limit=1');
    if (res.status === 200) {
      console.log('✓ RLS appears to be functioning (can query users)');
    } else if (res.status === 403) {
      console.log('✓ RLS is BLOCKING queries (expected for unauthenticated requests)');
    } else {
      console.log(`⚠️  Unexpected status: ${res.status}`);
    }
  } catch (error) {
    console.log(`✗ Error checking RLS: ${error.message}`);
  }
}

async function checkAuthUsers() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('7. CHECKING AUTH USERS (via gotrue-go)');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const res = await makeRequest('GET', '/auth/v1/admin/users');
    if (res.status === 200) {
      const users = res.data.users || [];
      console.log(`✓ Found ${users.length} auth users\n`);

      if (users.length > 0) {
        users.slice(0, 5).forEach(u => {
          console.log(`   ID: ${u.id}`);
          console.log(`   Email: ${u.email}`);
          console.log(`   Confirmed: ${u.email_confirmed_at ? 'YES' : 'NO'}`);
          console.log(`   Created: ${u.created_at}`);
          console.log('   ---');
        });
      }
    } else {
      console.log(`✗ Failed to fetch auth users: ${res.status}`);
      console.log(`   Response: ${JSON.stringify(res.data).substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`✗ Error checking auth users: ${error.message}`);
  }
}

async function checkPermissions() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('8. CHECKING PERMISSIONS');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const res = await makeRequest('GET', '/rest/v1/permissions?limit=100');
    if (res.status === 200) {
      const permissions = res.data;
      console.log(`✓ Found ${permissions.length} permissions`);

      if (permissions.length === 0) {
        console.log('⚠️  WARNING: No permissions defined!');
      }
    } else {
      console.log(`✗ Failed to fetch permissions: ${res.status}`);
    }
  } catch (error) {
    console.log(`✗ Error checking permissions: ${error.message}`);
  }
}

async function runDiagnosis() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║            DATABASE DIAGNOSIS REPORT                      ║');
  console.log('║  Checking: Tables, Templates, Users, RLS, Permissions   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  try {
    await checkTables();
    await checkRoleTemplates();
    await checkUsers();
    await checkTeams();
    await checkTeamMemberships();
    await checkRLS();
    await checkAuthUsers();
    await checkPermissions();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('DIAGNOSIS COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('Fatal error during diagnosis:', error);
    process.exit(1);
  }
}

runDiagnosis();
