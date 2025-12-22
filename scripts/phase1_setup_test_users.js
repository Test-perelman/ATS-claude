#!/usr/bin/env node
/**
 * Phase 1: Test Setup for Multi-Tenant v2 Testing
 * Creates test users and teams
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://awujhuncfghjshggkqyo.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: 'public' }
});

// Use timestamp to make emails unique across runs
const TS = Date.now();

const TEST_USERS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: `master_admin_${TS}@test.local`,
    password: 'Test123!@#Secure',
    firstName: 'Master',
    lastName: 'Admin',
    isMasterAdmin: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: `team_admin_a_${TS}@test.local`,
    password: 'Test123!@#Secure',
    firstName: 'Team',
    lastName: 'AdminA',
    isMasterAdmin: false,
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    email: `user_pending_a_${TS}@test.local`,
    password: 'Test123!@#Secure',
    firstName: 'User',
    lastName: 'PendingA',
    isMasterAdmin: false,
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    email: `user_approved_a_${TS}@test.local`,
    password: 'Test123!@#Secure',
    firstName: 'User',
    lastName: 'ApprovedA',
    isMasterAdmin: false,
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    email: `user_other_team_b_${TS}@test.local`,
    password: 'Test123!@#Secure',
    firstName: 'User',
    lastName: 'TeamB',
    isMasterAdmin: false,
  },
];

async function setupTestData() {
  console.log('='.repeat(80));
  console.log('PHASE 1: TEST SETUP - Creating Test Users and Teams');
  console.log('='.repeat(80));

  try {
    // Step 1: Delete existing test data
    console.log('\n[Step 1] Cleaning up existing test data...');
    await cleanupTestData();

    // Step 2: Create auth users
    console.log('\n[Step 2] Creating Supabase auth users...');
    const authUsers = {};
    const authUserIds = {}; // Map email to actual auth user ID
    for (const user of TEST_USERS) {
      try {
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            first_name: user.firstName,
            last_name: user.lastName,
          },
        });

        if (error) {
          // If user exists, try to get the user
          if (error.message.includes('already registered')) {
            console.log(`  ⚠️  User already exists: ${user.email}`);
            const { data: existingUser } = await supabase.auth.admin.getUserById(user.id);
            if (existingUser) {
              authUsers[user.email] = existingUser.user;
              authUserIds[user.email] = existingUser.user.id;
              console.log(`  ✓ Using existing user: ${user.email}`);
            }
          } else {
            throw error;
          }
        } else {
          authUsers[user.email] = data.user;
          authUserIds[user.email] = data.user.id;
          console.log(`  ✓ Created auth user: ${user.email} (${data.user.id})`);
        }
      } catch (err) {
        console.error(`  ❌ Failed to create user ${user.email}:`, err.message);
        throw err;
      }
    }

    // Step 3: Create database user records - master admin first
    console.log('\n[Step 3] Creating master admin user record...');
    const masterAdminUser = TEST_USERS[0];
    const teamAdminUser = TEST_USERS[1];

    // Use actual auth user IDs from step 2
    const masterAdminAuthId = authUserIds[masterAdminUser.email];
    const teamAdminAuthId = authUserIds[teamAdminUser.email];
    const pendingUserAuthId = authUserIds[TEST_USERS[2].email];
    const approvedUserAuthId = authUserIds[TEST_USERS[3].email];
    const teamBUserAuthId = authUserIds[TEST_USERS[4].email];

    // The auth trigger creates auto records for each auth user. We need to clean these up
    // because we want to assign users to shared teams (Team A, Team B), not personal teams.
    // Delete all auto-created user records and teams for our test users
    const allAuthIds = [masterAdminAuthId, teamAdminAuthId, pendingUserAuthId, approvedUserAuthId, teamBUserAuthId];

    for (const authId of allAuthIds) {
      // Delete the user record (if it was auto-created by trigger)
      try {
        await supabase
          .from('users')
          .delete()
          .eq('id', authId);
      } catch (err) {
        // Ignore if doesn't exist
      }
    }

    // Delete auto-created teams (those named after test user emails)
    const testEmails = TEST_USERS.map(u => u.email);
    const { data: autoTeams } = await supabase
      .from('teams')
      .select('id')
      .in('name', testEmails);

    if (autoTeams && autoTeams.length > 0) {
      try {
        await supabase
          .from('teams')
          .delete()
          .in('id', autoTeams.map(t => t.id));
      } catch (err) {
        // Ignore if doesn't exist
      }
    }

    // Now insert master admin with correct values
    const { error: masterError } = await supabase
      .from('users')
      .insert({
        id: masterAdminAuthId,
        email: masterAdminUser.email,
        team_id: null,
        role_id: null,
        is_master_admin: true,
      })
      .select()
      .single();

    if (masterError) {
      throw masterError;
    }
    console.log(`  ✓ Created master admin user record (id=${masterAdminAuthId})`);

    // Step 4: Create teams
    console.log('\n[Step 4] Creating teams...');
    const { data: teamA, error: teamAError } = await supabase
      .from('teams')
      .insert({ name: 'Team A' })
      .select()
      .single();

    if (teamAError) throw teamAError;
    console.log(`  ✓ Team A created: ${teamA.id}`);

    const { data: teamB, error: teamBError } = await supabase
      .from('teams')
      .insert({ name: 'Team B' })
      .select()
      .single();

    if (teamBError) throw teamBError;
    console.log(`  ✓ Team B created: ${teamB.id}`);

    // Step 5: Create roles for teams
    console.log('\n[Step 5] Creating team roles...');

    // Team A - Admin role
    const { data: localAdminRoleA, error: adminRoleAError } = await supabase
      .from('roles')
      .insert({
        team_id: teamA.id,
        name: 'Admin',
        is_admin: true,
      })
      .select()
      .single();

    if (adminRoleAError) throw adminRoleAError;
    console.log(`  ✓ Team A Admin Role: ${localAdminRoleA.id}`);

    // Team A - Member role
    const { data: memberRoleA, error: memberRoleAError } = await supabase
      .from('roles')
      .insert({
        team_id: teamA.id,
        name: 'Member',
        is_admin: false,
      })
      .select()
      .single();

    if (memberRoleAError) throw memberRoleAError;
    console.log(`  ✓ Team A Member Role: ${memberRoleA.id}`);

    // Team B - Admin role
    const { data: localAdminRoleB, error: adminRoleBError } = await supabase
      .from('roles')
      .insert({
        team_id: teamB.id,
        name: 'Admin',
        is_admin: true,
      })
      .select()
      .single();

    if (adminRoleBError) throw adminRoleBError;
    console.log(`  ✓ Team B Admin Role: ${localAdminRoleB.id}`);

    // Step 6: Create user records for ALL users (required by FK constraint)
    // NOTE: Pending users get a temporary role assignment, marked by pending status in team_memberships
    // When approved, the role_id will be updated from the requested_role_id
    console.log('\n[Step 6] Creating user records for all members...');

    // team_admin_A record (approved in Team A)
    const { error: teamAdminError } = await supabase
      .from('users')
      .insert({
        id: teamAdminAuthId,
        email: teamAdminUser.email,
        team_id: teamA.id,
        role_id: localAdminRoleA.id,
        is_master_admin: false,
      })
      .select()
      .single();

    if (teamAdminError) {
      throw teamAdminError;
    }
    console.log(`  ✓ team_admin_A user record created (team_id=${teamA.id}, role=admin)`);

    // user_pending_A record - must have team_id and role_id due to constraint
    // Will be marked as 'pending' in team_memberships with requested_role_id
    const { error: pendingUserRecordError } = await supabase
      .from('users')
      .insert({
        id: pendingUserAuthId,
        email: TEST_USERS[2].email,
        team_id: teamA.id,
        role_id: memberRoleA.id,
        is_master_admin: false,
      })
      .select()
      .single();

    if (pendingUserRecordError) {
      throw pendingUserRecordError;
    }
    console.log(`  ✓ user_pending_A user record created (team_id=${teamA.id}, role=member, but membership=pending)`);

    // user_approved_A record (approved in Team A with member role)
    const { error: approvedUserRecordError } = await supabase
      .from('users')
      .insert({
        id: approvedUserAuthId,
        email: TEST_USERS[3].email,
        team_id: teamA.id,
        role_id: memberRoleA.id,
        is_master_admin: false,
      })
      .select()
      .single();

    if (approvedUserRecordError) {
      throw approvedUserRecordError;
    }
    console.log(`  ✓ user_approved_A user record created (team_id=${teamA.id}, role=member, membership=approved)`);

    // user_other_team_B record (approved in Team B with admin role)
    const { error: teamBUserRecordError } = await supabase
      .from('users')
      .insert({
        id: teamBUserAuthId,
        email: TEST_USERS[4].email,
        team_id: teamB.id,
        role_id: localAdminRoleB.id,
        is_master_admin: false,
      })
      .select()
      .single();

    if (teamBUserRecordError) {
      throw teamBUserRecordError;
    }
    console.log(`  ✓ user_other_team_B user record created (team_id=${teamB.id}, role=admin, membership=approved)`);

    // Step 7: Create team memberships (NOW that all users exist)
    console.log('\n[Step 7] Creating team memberships...');

    // team_admin_A → approved admin of Team A
    const { error: adminMemberError } = await supabase
      .from('team_memberships')
      .insert({
        user_id: teamAdminAuthId,
        team_id: teamA.id,
        status: 'approved',
        requested_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
        approved_by: teamAdminAuthId,
      })
      .select()
      .single();

    if (adminMemberError && !adminMemberError.message.includes('unique')) {
      throw adminMemberError;
    }
    console.log(`  ✓ team_admin_A → approved member of Team A`);

    // user_pending_A → pending member of Team A
    const { error: pendingMemberError } = await supabase
      .from('team_memberships')
      .insert({
        user_id: pendingUserAuthId,
        team_id: teamA.id,
        status: 'pending',
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (pendingMemberError && !pendingMemberError.message.includes('unique')) {
      throw pendingMemberError;
    }
    console.log(`  ✓ user_pending_A → pending member of Team A`);

    // user_approved_A → approved member of Team A
    const { error: approvedMemberError } = await supabase
      .from('team_memberships')
      .insert({
        user_id: approvedUserAuthId,
        team_id: teamA.id,
        status: 'approved',
        requested_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
        approved_by: teamAdminAuthId,
        requested_role_id: memberRoleA.id,
      })
      .select()
      .single();

    if (approvedMemberError && !approvedMemberError.message.includes('unique')) {
      throw approvedMemberError;
    }
    console.log(`  ✓ user_approved_A → approved member of Team A`);

    // user_other_team_B → approved member of Team B
    const { error: teamBMemberError } = await supabase
      .from('team_memberships')
      .insert({
        user_id: teamBUserAuthId,
        team_id: teamB.id,
        status: 'approved',
        requested_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
        approved_by: teamBUserAuthId,
      })
      .select()
      .single();

    if (teamBMemberError && !teamBMemberError.message.includes('unique')) {
      throw teamBMemberError;
    }
    console.log(`  ✓ user_other_team_B → approved member of Team B`);

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 1 SETUP COMPLETE');
    console.log('='.repeat(80));
    console.log('\nTest User Summary:');
    console.log(`  master_admin: ${masterAdminUser.email} (id=${masterAdminAuthId}, is_master_admin=true, team_id=null)`);
    console.log(`  team_admin_A: ${teamAdminUser.email} (id=${teamAdminAuthId}, team_id=${teamA.id}, role=admin, membership=approved)`);
    console.log(`  user_pending_A: ${TEST_USERS[2].email} (id=${pendingUserAuthId}, team_id=${teamA.id}, membership=pending)`);
    console.log(`  user_approved_A: ${TEST_USERS[3].email} (id=${approvedUserAuthId}, team_id=${teamA.id}, membership=approved)`);
    console.log(`  user_other_team_B: ${TEST_USERS[4].email} (id=${teamBUserAuthId}, team_id=${teamB.id}, membership=approved)`);
    console.log('\nTeam Summary:');
    console.log(`  Team A: ${teamA.id}`);
    console.log(`  Team B: ${teamB.id}`);
    console.log('\nTest credentials saved to: ./test-credentials.json');

    // Save credentials for Phase 2-3 testing
    const credentials = {
      supabaseUrl: SUPABASE_URL,
      teams: {
        teamA: { id: teamA.id, name: teamA.name },
        teamB: { id: teamB.id, name: teamB.name },
      },
      users: {
        master_admin: {
          id: masterAdminAuthId,
          email: masterAdminUser.email,
          password: masterAdminUser.password,
          isAuth: true,
          isMasterAdmin: true,
        },
        team_admin_A: {
          id: teamAdminAuthId,
          email: teamAdminUser.email,
          password: teamAdminUser.password,
          isAuth: true,
          teamId: teamA.id,
          roleId: localAdminRoleA.id,
        },
        user_pending_A: {
          id: pendingUserAuthId,
          email: TEST_USERS[2].email,
          password: TEST_USERS[2].password,
          isAuth: true,
          teamId: teamA.id,
          membershipStatus: 'pending',
        },
        user_approved_A: {
          id: approvedUserAuthId,
          email: TEST_USERS[3].email,
          password: TEST_USERS[3].password,
          isAuth: true,
          teamId: teamA.id,
          roleId: memberRoleA.id,
          membershipStatus: 'approved',
        },
        user_other_team_B: {
          id: teamBUserAuthId,
          email: TEST_USERS[4].email,
          password: TEST_USERS[4].password,
          isAuth: true,
          teamId: teamB.id,
          roleId: localAdminRoleB.id,
          membershipStatus: 'approved',
        },
      },
    };

    require('fs').writeFileSync(
      './test-credentials.json',
      JSON.stringify(credentials, null, 2)
    );

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

async function cleanupTestData() {
  try {
    // Step 1: Delete test users first (removes FK references to teams)
    const { data: allTestUsers, error: getTestUsersError } = await supabase
      .from('users')
      .select('id, email')
      .like('email', '%test.local%');

    if (!getTestUsersError && allTestUsers && allTestUsers.length > 0) {
      const testUserIds = allTestUsers
        .filter(u =>
          u.email.includes('master_admin_') ||
          u.email.includes('team_admin_a_') ||
          u.email.includes('user_pending_a_') ||
          u.email.includes('user_approved_a_') ||
          u.email.includes('user_other_team_b_')
        )
        .map(u => u.id);

      if (testUserIds.length > 0) {
        const { error: deleteUsersError } = await supabase
          .from('users')
          .delete()
          .in('id', testUserIds);

        if (deleteUsersError && !deleteUsersError.message.includes('no rows')) {
          console.warn('Warning deleting users:', deleteUsersError.message);
        }
      }
    }

    // Step 2: Delete test teams (including both auto-created and shared teams)
    // Try to delete Team A and Team B first
    const { data: sharedTeams, error: getSharedTeamsError } = await supabase
      .from('teams')
      .select('id')
      .in('name', ['Team A', 'Team B']);

    if (!getSharedTeamsError && sharedTeams && sharedTeams.length > 0) {
      const { error: deleteTeamsError } = await supabase
        .from('teams')
        .delete()
        .in('id', sharedTeams.map(t => t.id));

      if (deleteTeamsError && !deleteTeamsError.message.includes('no rows')) {
        console.warn('Warning deleting Team A/B:', deleteTeamsError.message);
      }
    }

    // Delete any remaining auto-created test teams (those named after test users)
    const { data: allTeams, error: getAllTeamsError } = await supabase
      .from('teams')
      .select('id, name');

    if (!getAllTeamsError && allTeams && allTeams.length > 0) {
      const autoCreatedTeams = allTeams.filter(t =>
        t.name.includes('master_admin_') ||
        t.name.includes('team_admin_a_') ||
        t.name.includes('user_pending_a_') ||
        t.name.includes('user_approved_a_') ||
        t.name.includes('user_other_team_b_')
      );

      if (autoCreatedTeams.length > 0) {
        const { error: deleteTeamsError } = await supabase
          .from('teams')
          .delete()
          .in('id', autoCreatedTeams.map(t => t.id));

        if (deleteTeamsError && !deleteTeamsError.message.includes('no rows')) {
          console.warn('Warning deleting auto-created teams:', deleteTeamsError.message);
        }
      }
    }

    console.log(`  ✓ Cleaned up test teams`);

    // Step 3: Delete test users from auth
    for (const user of TEST_USERS) {
      try {
        await supabase.auth.admin.deleteUser(user.id);
        console.log(`  ✓ Deleted auth user: ${user.email}`);
      } catch (err) {
        // User might not exist in auth
        if (!err.message.includes('not found')) {
          console.warn(`Warning deleting auth user ${user.email}:`, err.message);
        }
      }
    }
  } catch (error) {
    console.warn('Cleanup warning:', error.message);
  }
}

setupTestData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
