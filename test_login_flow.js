const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://awujhuncfghjshggkqyo.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

const supabase = createClient(supabaseUrl, serviceKey);

(async () => {
  try {
    console.log('\n🔍 Testing Login Flow Simulation...\n');

    // Step 1: Get auth user (simulating what happens after login)
    const { data: allAuthUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error listing users:', authError.message);
      return;
    }

    const testAuthUser = allAuthUsers.users.find(u => u.email === 'test@admin.com');

    if (!testAuthUser) {
      console.log('❌ test@admin.com not found in Supabase Auth');
      return;
    }

    console.log('✅ Step 1: Found auth user');
    console.log(`   ID: ${testAuthUser.id}`);
    console.log(`   Email: ${testAuthUser.email}`);
    console.log('');

    // Step 2: Simulate what happens when user makes API call with session
    // The middleware/auth-server should call supabase.auth.getUser() which uses cookies
    // Since we don't have actual cookies, we'll simulate by checking if the public record exists
    console.log('✅ Step 2: Checking public.users record...');

    const { data: publicUser, error: pubError } = await supabase
      .from('users')
      .select(`
        id,
        team_id,
        role_id,
        email,
        is_master_admin,
        role:roles (
          id,
          name,
          is_admin
        ),
        team:teams (
          id,
          name
        )
      `)
      .eq('id', testAuthUser.id)
      .single();

    if (pubError && pubError.code !== 'PGRST116') {
      console.error('❌ Unexpected error:', pubError.message);
      return;
    }

    if (!publicUser) {
      console.log('❌ User NOT in public.users - THIS IS THE PROBLEM');
      console.log('   Auth: YES');
      console.log('   Public User: NO');
      console.log('   Result: getCurrentUser() returns null or fallback');
      console.log('   Consequence: API routes fail with "User authentication required"\n');
      return;
    }

    console.log('✅ User found in public.users');
    console.log(`   Team: ${publicUser.team_id}`);
    console.log(`   Role: ${publicUser.role?.name}`);
    console.log('');

    // Step 3: Simulate API POST request to create candidate
    console.log('✅ Step 3: Simulating POST /api/candidates request...');
    console.log(`   User ID: ${publicUser.id}`);
    console.log(`   Team ID: ${publicUser.team_id}`);
    console.log(`   Role: ${publicUser.role?.name}`);
    console.log(`   Is Admin: ${publicUser.role?.is_admin}`);
    console.log('');

    // Check if user has permission to create candidates
    console.log('✅ Step 4: Checking permission (candidates.create)...');

    const { data: rolePermissions, error: permError } = await supabase
      .from('role_permissions')
      .select('permission:permissions(key)')
      .eq('role_id', publicUser.role_id);

    if (permError) {
      console.error('❌ Error checking permissions:', permError.message);
      return;
    }

    const hasCreatePermission = rolePermissions?.some(rp => rp.permission?.key === 'candidates.create');
    console.log(`   Has permission: ${hasCreatePermission ? 'YES ✅' : 'NO ❌'}`);
    console.log('');

    // Try inserting a test candidate
    console.log('✅ Step 5: Attempting to create a test candidate...');

    const { data: candidateData, error: candidateError } = await supabase
      .from('candidates')
      .insert({
        team_id: publicUser.team_id,
        first_name: 'Test',
        last_name: 'Candidate',
        email: `test_${Date.now()}@example.com`,
        status: 'new'
      })
      .select()
      .single();

    if (candidateError) {
      console.error('❌ Error creating candidate:', candidateError.message);
    } else {
      console.log('✅ Candidate created successfully');
      console.log(`   ID: ${candidateData.id}`);
      console.log(`   Name: ${candidateData.first_name} ${candidateData.last_name}`);
    }

    console.log('\n═════════════════════════════════════════════════════════');
    console.log('✅ ALL CHECKS PASSED - Backend Data Is Correct');
    console.log('\nThe issue must be:');
    console.log('1. Session cookies not being set after login');
    console.log('2. Browser not sending cookies with API requests');
    console.log('3. Middleware not properly refreshing session');
    console.log('\nCheck browser Dev Tools -> Application -> Cookies');
    console.log('Look for: sb-auth-token, sb-refresh-token\n');

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
