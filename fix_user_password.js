const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://awujhuncfghjshggkqyo.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

const supabase = createClient(supabaseUrl, serviceKey);

(async () => {
  try {
    console.log('\n🔍 Checking for existing user...\n');

    // First get auth users to find the user ID
    const { data: allAuthUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error listing users:', authError.message);
      return;
    }

    const authUser = allAuthUsers.users.find(u => u.email === 'test@admin.com');

    if (!authUser) {
      console.log('❌ User test@admin.com not found in auth system\n');
      console.log('Need to create new user. Please retry signup on the app.\n');
      return;
    }

    console.log('✅ User exists in Auth system\n');
    console.log(`User ID: ${authUser.id}`);
    console.log(`Email: ${authUser.email}`);
    console.log(`Status: ${authUser.email_confirmed_at ? 'Email confirmed' : 'Email not confirmed'}\n`);

    // Check in public.users
    const { data: publicUser, error: pubError } = await supabase
      .from('users')
      .select('id, email, team_id')
      .eq('id', authUser.id)
      .single();

    if (pubError) {
      console.log('⚠️ User not in public.users table yet\n');
      console.log('The user record will be created when they first log in.\n');
    } else {
      console.log('✅ User exists in public.users table');
      console.log(`Team: ${publicUser.team_id}\n`);
    }

    // Update password
    console.log('🔑 Updating password to: Test@2025\n');
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      authUser.id,
      { password: 'Test@2025' }
    );

    if (updateError) {
      console.error('❌ Error:', updateError.message);
    } else {
      console.log('✅ Password updated successfully!\n');
    }

    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('✅ READY TO LOGIN\n');
    console.log('Credentials:');
    console.log('  Email:    test@admin.com');
    console.log('  Password: Test@2025\n');
    console.log('Steps:');
    console.log('1. Go to: https://ats-claude.vercel.app');
    console.log('2. Click "Sign in"');
    console.log('3. Enter credentials above');
    console.log('4. You should be logged in!\n');
    console.log('If it asks about team setup, choose "Create New Team"\n');

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
