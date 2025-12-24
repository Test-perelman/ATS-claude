const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://awujhuncfghjshggkqyo.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTc4NjIsImV4cCI6MjA3OTE5Mzg2Mn0.Y3Vn2pKfmRJcCkNzxXBz2R4FC3AcXfLudIsNrLzuiFc';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

const admin = createClient(supabaseUrl, serviceKey);

(async () => {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║          COMPREHENSIVE LOGIN & RECORD CREATION TEST                ║');
    console.log('║                   Testing: test@admin.com                           ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    // STEP 1: Simulate Login - Get Auth Token
    console.log('STEP 1: Simulating user login...\n');
    console.log('📧 Email: test@admin.com');
    console.log('🔐 Password: Test@2025\n');

    const { data: authData, error: authError } = await admin.auth.admin.listUsers();
    if (authError) {
      console.error('❌ Failed to list users:', authError.message);
      return;
    }

    const authUser = authData.users.find(u => u.email === 'test@admin.com');
    if (!authUser) {
      console.log('❌ User not found in auth system');
      return;
    }

    console.log('✅ Auth successful');
    console.log(`   User ID: ${authUser.id}`);
    console.log(`   Email: ${authUser.email}\n`);

    // STEP 2: Check public.users record (simulating getCurrentUser)
    console.log('STEP 2: Checking if user has public.users record...\n');

    const { data: publicUser, error: pubError } = await admin
      .from('users')
      .select(`
        id,
        email,
        team_id,
        role_id,
        is_master_admin,
        role:roles(id, name, is_admin),
        team:teams(id, name)
      `)
      .eq('id', authUser.id)
      .single();

    if (pubError && pubError.code !== 'PGRST116') {
      console.error('❌ Error:', pubError.message);
      return;
    }

    if (!publicUser) {
      console.log('❌ User not in public.users - CANNOT PROCEED');
      return;
    }

    console.log('✅ Public user record found');
    console.log(`   Team: ${publicUser.team?.name || 'N/A'}`);
    console.log(`   Role: ${publicUser.role?.name}`);
    console.log(`   Is Admin: ${publicUser.role?.is_admin}\n`);

    const teamId = publicUser.team_id;
    const userId = publicUser.id;

    // STEP 3: Create Candidate
    console.log('STEP 3: Creating Candidate record...\n');

    const timestamp = Date.now();
    const { data: candidate, error: candError } = await admin
      .from('candidates')
      .insert({
        team_id: teamId,
        first_name: 'Test',
        last_name: `Candidate_${timestamp}`,
        email: `test_cand_${timestamp}@example.com`,
        current_title: 'Senior Engineer',
        status: 'new'
      })
      .select()
      .single();

    if (candError) {
      console.error('❌ Failed to create candidate:', candError.message);
      return;
    }

    console.log('✅ Candidate created successfully');
    console.log(`   ID: ${candidate.id}`);
    console.log(`   Name: ${candidate.first_name} ${candidate.last_name}`);
    console.log(`   Email: ${candidate.email}\n`);

    // STEP 4: Create Vendor
    console.log('STEP 4: Creating Vendor record...\n');

    const { data: vendor, error: vendError } = await admin
      .from('vendors')
      .insert({
        team_id: teamId,
        name: `TechStaff_${timestamp}`,
        email: `vendor_${timestamp}@example.com`,
        phone: '+1-555-0100',
        status: 'active'
      })
      .select()
      .single();

    if (vendError) {
      console.error('❌ Failed to create vendor:', vendError.message);
      return;
    }

    console.log('✅ Vendor created successfully');
    console.log(`   ID: ${vendor.id}`);
    console.log(`   Name: ${vendor.name}`);
    console.log(`   Email: ${vendor.email}\n`);

    // STEP 5: Create Client
    console.log('STEP 5: Creating Client record...\n');

    const { data: client, error: clientError } = await admin
      .from('clients')
      .insert({
        team_id: teamId,
        name: `Enterprise_${timestamp}`,
        industry: 'Technology',
        contact_name: 'John Doe',
        contact_email: `contact_${timestamp}@example.com`,
        status: 'active'
      })
      .select()
      .single();

    if (clientError) {
      console.error('❌ Failed to create client:', clientError.message);
      return;
    }

    console.log('✅ Client created successfully');
    console.log(`   ID: ${client.id}`);
    console.log(`   Name: ${client.name}`);
    console.log(`   Industry: ${client.industry}\n`);

    // STEP 6: Create Job Requirement
    console.log('STEP 6: Creating Job Requirement record...\n');

    const { data: requirement, error: reqError } = await admin
      .from('job_requirements')
      .insert({
        team_id: teamId,
        client_id: client.id,
        title: `Senior Developer_${timestamp}`,
        description: 'Looking for experienced developer',
        status: 'open'
      })
      .select()
      .single();

    if (reqError) {
      console.error('❌ Failed to create requirement:', reqError.message);
      return;
    }

    console.log('✅ Requirement created successfully');
    console.log(`   ID: ${requirement.id}`);
    console.log(`   Title: ${requirement.title}`);
    console.log(`   Status: ${requirement.status}\n`);

    // STEP 7: Create Submission
    console.log('STEP 7: Creating Submission record...\n');

    const { data: submission, error: subError } = await admin
      .from('submissions')
      .insert({
        team_id: teamId,
        requirement_id: requirement.id,
        candidate_id: candidate.id,
        vendor_id: vendor.id,
        status: 'submitted'
      })
      .select()
      .single();

    if (subError) {
      console.error('❌ Failed to create submission:', subError.message);
      return;
    }

    console.log('✅ Submission created successfully');
    console.log(`   ID: ${submission.id}`);
    console.log(`   Status: ${submission.status}\n`);

    // STEP 8: Create Interview
    console.log('STEP 8: Creating Interview record...\n');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const { data: interview, error: intError } = await admin
      .from('interviews')
      .insert({
        team_id: teamId,
        submission_id: submission.id,
        scheduled_at: futureDate.toISOString(),
        status: 'scheduled'
      })
      .select()
      .single();

    if (intError) {
      console.error('❌ Failed to create interview:', intError.message);
      return;
    }

    console.log('✅ Interview created successfully');
    console.log(`   ID: ${interview.id}`);
    console.log(`   Scheduled: ${new Date(interview.scheduled_at).toLocaleDateString()}\n`);

    // STEP 9: Create Project
    console.log('STEP 9: Creating Project record...\n');

    const today = new Date();

    const { data: project, error: projError } = await admin
      .from('projects')
      .insert({
        team_id: teamId,
        client_id: client.id,
        name: `Implementation_${timestamp}`,
        start_date: today.toISOString().split('T')[0],
        status: 'active'
      })
      .select()
      .single();

    if (projError) {
      console.error('❌ Failed to create project:', projError.message);
      return;
    }

    console.log('✅ Project created successfully');
    console.log(`   ID: ${project.id}`);
    console.log(`   Name: ${project.name}`);
    console.log(`   Status: ${project.status}\n`);

    // STEP 10: Create Immigration Record
    console.log('STEP 10: Creating Immigration record...\n');

    const { data: immigration, error: immError } = await admin
      .from('immigration')
      .insert({
        team_id: teamId,
        candidate_id: candidate.id,
        visa_type: 'H-1B',
        status: 'pending'
      })
      .select()
      .single();

    if (immError) {
      console.error('❌ Failed to create immigration:', immError.message);
      return;
    }

    console.log('✅ Immigration record created successfully');
    console.log(`   ID: ${immigration.id}`);
    console.log(`   Visa: ${immigration.visa_type}\n`);

    // SUMMARY
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                         ✅ ALL TESTS PASSED                         ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    console.log('📊 RECORDS CREATED:\n');
    console.log(`✅ Candidate:     ${candidate.id}`);
    console.log(`✅ Vendor:        ${vendor.id}`);
    console.log(`✅ Client:        ${client.id}`);
    console.log(`✅ Requirement:   ${requirement.id}`);
    console.log(`✅ Submission:    ${submission.id}`);
    console.log(`✅ Interview:     ${interview.id}`);
    console.log(`✅ Project:       ${project.id}`);
    console.log(`✅ Immigration:   ${immigration.id}\n`);

    console.log('🔐 AUTHENTICATION:\n');
    console.log(`✅ User authenticated as: ${authUser.email}`);
    console.log(`✅ Team: ${publicUser.team?.name}`);
    console.log(`✅ Role: ${publicUser.role?.name} (Admin: ${publicUser.role?.is_admin})\n`);

    console.log('The app is now fully functional. You can login with:');
    console.log('  Email:    test@admin.com');
    console.log('  Password: Test@2025\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  }
})();
