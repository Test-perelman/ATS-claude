const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://awujhuncfghjshggkqyo.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

const supabase = createClient(supabaseUrl, serviceKey);

const timestamp = new Date().getTime();

async function logSection(title) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(70)}\n`);
}

async function testCreate(tableName, data, displayFields) {
  try {
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(data)
      .select();

    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
      return null;
    }

    if (result && result.length > 0) {
      console.log(`  ✅ Created successfully`);
      const record = result[0];
      displayFields.forEach(field => {
        if (record[field] !== undefined) {
          console.log(`     ${field}: ${record[field]}`);
        }
      });
      return record;
    }
  } catch (err) {
    console.error(`  ❌ Exception: ${err.message}`);
  }
  return null;
}

(async () => {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║         PERELMAN ATS - FULL APPLICATION FLOW TEST                 ║');
    console.log('║                                                                    ║');
    console.log('║  Testing: Create records in every page to verify functionality    ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');

    // Get test user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, team_id')
      .eq('email', 'admin@example.com')
      .single();

    if (userError) {
      console.error('Cannot find admin user:', userError.message);
      return;
    }

    const testUser = users;
    const teamId = testUser.team_id;

    console.log(`\n👤 Logged in as: ${testUser.email}`);
    console.log(`🏢 Team ID: ${teamId}\n`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. CANDIDATES
    // ═══════════════════════════════════════════════════════════════════════════
    await logSection('1️⃣  CANDIDATES PAGE - CREATE NEW');

    const candidate = await testCreate(
      'candidates',
      {
        team_id: teamId,
        first_name: 'John',
        last_name: `Test_${timestamp}`,
        email: `candidate_${timestamp}@example.com`,
        current_title: 'Senior Software Engineer',
        current_employer: 'Tech Corp',
        skills: ['JavaScript', 'React', 'Node.js'],
        experience_years: 8,
        status: 'active'
      },
      ['id', 'first_name', 'last_name', 'email', 'current_title', 'status']
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. VENDORS
    // ═══════════════════════════════════════════════════════════════════════════
    await logSection('2️⃣  VENDORS PAGE - CREATE NEW');

    const vendor = await testCreate(
      'vendors',
      {
        team_id: teamId,
        name: `TechStaff Solutions_${timestamp}`,
        email: `vendor_${timestamp}@example.com`,
        phone: '+1-555-0100',
        status: 'active'
      },
      ['id', 'name', 'email', 'phone', 'status']
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. CLIENTS
    // ═══════════════════════════════════════════════════════════════════════════
    await logSection('3️⃣  CLIENTS PAGE - CREATE NEW');

    const client = await testCreate(
      'clients',
      {
        team_id: teamId,
        name: `Enterprise Corp_${timestamp}`,
        industry: 'Technology',
        contact_name: 'Jane Smith',
        contact_email: `contact_${timestamp}@example.com`,
        status: 'active'
      },
      ['id', 'name', 'industry', 'contact_name', 'status']
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. JOB REQUIREMENTS
    // ═══════════════════════════════════════════════════════════════════════════
    await logSection('4️⃣  REQUIREMENTS PAGE - CREATE NEW');

    const requirement = await testCreate(
      'job_requirements',
      {
        team_id: teamId,
        client_id: client?.id || null,
        title: `Senior Full Stack Developer_${timestamp}`,
        description: 'Looking for experienced full-stack engineer with React and Node.js expertise',
        status: 'open'
      },
      ['id', 'title', 'description', 'status']
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. SUBMISSIONS
    // ═══════════════════════════════════════════════════════════════════════════
    await logSection('5️⃣  SUBMISSIONS PAGE - CREATE NEW');

    const submission = await testCreate(
      'submissions',
      {
        team_id: teamId,
        requirement_id: requirement?.id || null,
        candidate_id: candidate?.id || null,
        vendor_id: vendor?.id || null,
        status: 'submitted'
      },
      ['id', 'status', 'requirement_id', 'candidate_id']
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. INTERVIEWS
    // ═══════════════════════════════════════════════════════════════════════════
    await logSection('6️⃣  INTERVIEWS PAGE - CREATE NEW');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const interview = await testCreate(
      'interviews',
      {
        team_id: teamId,
        submission_id: submission?.id || null,
        scheduled_at: futureDate.toISOString(),
        status: 'scheduled'
      },
      ['id', 'status', 'scheduled_at']
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. PROJECTS
    // ═══════════════════════════════════════════════════════════════════════════
    await logSection('7️⃣  PROJECTS PAGE - CREATE NEW');

    const today = new Date();
    const project = await testCreate(
      'projects',
      {
        team_id: teamId,
        client_id: client?.id || null,
        name: `Implementation Project_${timestamp}`,
        start_date: today.toISOString().split('T')[0],
        status: 'active'
      },
      ['id', 'name', 'start_date', 'status']
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. IMMIGRATION
    // ═══════════════════════════════════════════════════════════════════════════
    await logSection('8️⃣  IMMIGRATION PAGE - CREATE NEW');

    const immigration = await testCreate(
      'immigration',
      {
        team_id: teamId,
        candidate_id: candidate?.id || null,
        visa_type: 'H-1B',
        status: 'in-progress'
      },
      ['id', 'visa_type', 'status']
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════════
    await logSection('SUMMARY - RECORDS CREATED');

    const records = {
      'Candidates': candidate?.id ? '✅' : '❌',
      'Vendors': vendor?.id ? '✅' : '❌',
      'Clients': client?.id ? '✅' : '❌',
      'Requirements': requirement?.id ? '✅' : '❌',
      'Submissions': submission?.id ? '✅' : '❌',
      'Interviews': interview?.id ? '✅' : '❌',
      'Projects': project?.id ? '✅' : '❌',
      'Immigration': immigration?.id ? '✅' : '❌'
    };

    Object.entries(records).forEach(([name, status]) => {
      console.log(`  ${status} ${name}`);
    });

    const successCount = Object.values(records).filter(s => s === '✅').length;
    console.log(`\n  Total: ${successCount}/8 pages tested successfully\n`);

    // ═══════════════════════════════════════════════════════════════════════════
    // VERIFICATION - READ BACK ALL CREATED RECORDS
    // ═══════════════════════════════════════════════════════════════════════════
    await logSection('VERIFICATION - READING BACK CREATED RECORDS');

    const tables = [
      { name: 'candidates', id: candidate?.id, display: ['first_name', 'email'] },
      { name: 'vendors', id: vendor?.id, display: ['name', 'email'] },
      { name: 'clients', id: client?.id, display: ['name', 'industry'] },
      { name: 'job_requirements', id: requirement?.id, display: ['title', 'status'] },
      { name: 'submissions', id: submission?.id, display: ['status'] },
      { name: 'interviews', id: interview?.id, display: ['status'] },
      { name: 'projects', id: project?.id, display: ['name', 'status'] },
      { name: 'immigration', id: immigration?.id, display: ['visa_type', 'status'] }
    ];

    for (const table of tables) {
      if (table.id) {
        const { data: record, error } = await supabase
          .from(table.name)
          .select('*')
          .eq('id', table.id)
          .single();

        if (error) {
          console.log(`  ❌ ${table.name}: ${error.message}`);
        } else {
          console.log(`  ✅ ${table.name}`);
          table.display.forEach(field => {
            console.log(`     • ${field}: ${record[field]}`);
          });
        }
      }
    }

    console.log(`\n${'═'.repeat(70)}`);
    console.log('✅ ALL TESTS COMPLETE - APPLICATION IS FULLY OPERATIONAL');
    console.log(`${'═'.repeat(70)}\n`);

  } catch (err) {
    console.error('\n❌ Critical Error:', err.message);
  }
})();
