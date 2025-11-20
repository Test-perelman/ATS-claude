/**
 * Mock Data Seeding Script
 * Populates the database with realistic test data
 * Run: node scripts/seed-mock-data.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mock data arrays
const firstNames = [
  'Rajesh', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Arjun', 'Kavya',
  'Sanjay', 'Deepika', 'Rahul', 'Pooja', 'Karthik', 'Meera', 'Suresh', 'Divya',
  'Michael', 'Sarah', 'David', 'Jennifer', 'Robert', 'Lisa', 'James', 'Emily',
  'John', 'Maria', 'William', 'Jessica', 'Christopher', 'Michelle'
];

const lastNames = [
  'Kumar', 'Sharma', 'Patel', 'Singh', 'Reddy', 'Iyer', 'Gupta', 'Nair',
  'Mehta', 'Joshi', 'Rao', 'Desai', 'Pillai', 'Agarwal', 'Kulkarni', 'Menon',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Martinez', 'Rodriguez', 'Wilson', 'Anderson', 'Taylor', 'Thomas'
];

const skills = [
  'Java, Spring Boot, Microservices, AWS',
  'React, Node.js, TypeScript, MongoDB',
  'Python, Django, PostgreSQL, Docker',
  '.NET Core, C#, Azure, SQL Server',
  'Angular, JavaScript, REST APIs, Jenkins',
  'AWS, Kubernetes, Terraform, CI/CD',
  'Data Engineer, Spark, Hadoop, Python',
  'QA Automation, Selenium, Java, TestNG',
  'iOS Development, Swift, Objective-C',
  'Android Development, Kotlin, Java',
  'Full Stack, MERN, GraphQL, Redis',
  'DevOps, Jenkins, Docker, AWS',
  'Machine Learning, Python, TensorFlow',
  'Salesforce, Apex, Lightning, Admin',
  'SAP FICO, S/4HANA, ABAP'
];

const roles = [
  'Java Full Stack Developer',
  'React Developer',
  'Python Developer',
  '.NET Developer',
  'Angular Developer',
  'DevOps Engineer',
  'Data Engineer',
  'QA Automation Engineer',
  'iOS Developer',
  'Android Developer',
  'Full Stack Developer',
  'Cloud Architect',
  'ML Engineer',
  'Salesforce Developer',
  'SAP Consultant'
];

const cities = [
  'New York, NY', 'San Francisco, CA', 'Austin, TX', 'Seattle, WA',
  'Chicago, IL', 'Boston, MA', 'Denver, CO', 'Atlanta, GA',
  'Dallas, TX', 'Los Angeles, CA', 'Phoenix, AZ', 'Charlotte, NC',
  'Minneapolis, MN', 'Portland, OR', 'San Diego, CA'
];

const vendorNames = [
  'TechStaffing Solutions', 'Elite IT Consultants', 'Global Tech Partners',
  'Prime Workforce Solutions', 'Apex Technology Services', 'Vertex IT Staffing',
  'NextGen Consulting Group', 'Pinnacle Tech Resources', 'Quantum IT Solutions',
  'Synergy Workforce Partners', 'Catalyst Consulting Group', 'Fusion IT Services',
  'CoreTech Staffing', 'Nexus Professional Services', 'Summit IT Solutions'
];

const clientNames = [
  'JPMorgan Chase', 'Bank of America', 'Wells Fargo', 'Citigroup',
  'Goldman Sachs', 'Morgan Stanley', 'American Express', 'Capital One',
  'Amazon', 'Microsoft', 'Google', 'Apple', 'Meta',
  'Tesla', 'Netflix', 'Adobe', 'Salesforce', 'Oracle',
  'Pfizer', 'Johnson & Johnson', 'UnitedHealth Group', 'CVS Health',
  'Walmart', 'Target', 'Home Depot', 'Costco'
];

const industries = [
  'Financial Services', 'Banking', 'Investment Banking', 'Insurance',
  'Technology', 'E-commerce', 'Cloud Computing', 'Software',
  'Healthcare', 'Pharmaceuticals', 'Biotechnology',
  'Retail', 'Consumer Goods', 'Manufacturing', 'Telecommunications'
];

const jobTitles = [
  'Senior Java Developer', 'Full Stack Engineer', 'React Developer',
  'Python Developer', 'DevOps Engineer', 'Cloud Architect',
  'Data Engineer', 'QA Automation Engineer', 'Scrum Master',
  'Business Analyst', 'Project Manager', 'Solution Architect',
  'Frontend Developer', 'Backend Developer', 'Mobile Developer'
];

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateEmail(firstName, lastName, id = '') {
  const suffix = id ? id : Math.random().toString(36).substring(7);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${suffix}@email.com`;
}

function generatePhone() {
  return `${randomNumber(201, 999)}-${randomNumber(200, 999)}-${randomNumber(1000, 9999)}`;
}

async function seedMockData() {
  console.log('🌱 Starting mock data seeding...\n');

  try {
    // Get visa statuses
    const { data: visaStatuses } = await supabase.from('visa_status').select('visa_status_id, visa_name');
    console.log(`✅ Found ${visaStatuses.length} visa statuses`);

    // Get roles
    const { data: roles } = await supabase.from('roles').select('role_id, role_name');
    console.log(`✅ Found ${roles.length} roles\n`);

    // 1. Create Users (Sales & Recruiting team)
    console.log('👥 Creating users...');
    const users = [];
    const userRoles = ['Sales Manager', 'Sales Executive', 'Recruiter Manager', 'Recruiter Executive'];

    for (let i = 0; i < 10; i++) {
      const firstName = randomElement(firstNames);
      const lastName = randomElement(lastNames);
      const role = roles.find(r => r.role_name === randomElement(userRoles));

      users.push({
        username: `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
        email: generateEmail(firstName, lastName),
        phone: generatePhone(),
        role_id: role?.role_id,
        status: 'active'
      });
    }

    const { data: insertedUsers, error: userError } = await supabase
      .from('users')
      .insert(users)
      .select();

    if (userError) {
      console.error('❌ Error creating users:', userError.message);
    } else {
      console.log(`✅ Created ${insertedUsers.length} users`);
    }

    // 2. Create Vendors
    console.log('🏢 Creating vendors...');
    const vendors = vendorNames.map(name => ({
      vendor_name: name,
      tier_level: randomElement(['Tier 1', 'Tier 2', 'Tier 3', 'MSP', 'Direct']),
      contact_name: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
      contact_email: `contact@${name.toLowerCase().replace(/\s+/g, '')}.com`,
      contact_phone: generatePhone(),
      preferred_communication_mode: randomElement(['Email', 'Phone', 'Teams', 'Slack']),
      payment_terms: randomElement(['Net 30', 'Net 45', 'Net 60']),
      payment_terms_days: randomElement([30, 45, 60]),
      website: `https://www.${name.toLowerCase().replace(/\s+/g, '')}.com`,
      is_active: true,
      created_by: insertedUsers[0]?.user_id
    }));

    const { data: insertedVendors, error: vendorError } = await supabase
      .from('vendors')
      .insert(vendors)
      .select();

    if (vendorError) {
      console.error('❌ Error creating vendors:', vendorError.message);
    } else {
      console.log(`✅ Created ${insertedVendors.length} vendors`);
    }

    // 3. Create Clients
    console.log('🏦 Creating clients...');
    const clients = clientNames.map(name => {
      const industry = randomElement(industries);
      const city = randomElement(cities);
      const [cityName, state] = city.split(', ');

      return {
        client_name: name,
        industry: industry,
        address: `${randomNumber(100, 9999)} ${randomElement(['Main', 'Oak', 'Elm', 'Park', 'Broadway'])} Street`,
        city: cityName,
        state: state,
        zip_code: `${randomNumber(10000, 99999)}`,
        primary_contact_name: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
        primary_contact_email: `contact@${name.toLowerCase().replace(/\s+/g, '').replace(/&/g, 'and')}.com`,
        primary_contact_phone: generatePhone(),
        payment_terms: randomElement(['Net 30', 'Net 45', 'Net 60', 'Net 90']),
        payment_terms_days: randomElement([30, 45, 60, 90]),
        website: `https://www.${name.toLowerCase().replace(/\s+/g, '').replace(/&/g, 'and')}.com`,
        is_active: true,
        created_by: insertedUsers[0]?.user_id
      };
    });

    const { data: insertedClients, error: clientError } = await supabase
      .from('clients')
      .insert(clients)
      .select();

    if (clientError) {
      console.error('❌ Error creating clients:', clientError.message);
    } else {
      console.log(`✅ Created ${insertedClients.length} clients`);
    }

    // 4. Create Candidates
    console.log('👨‍💼 Creating candidates...');
    const candidates = [];

    for (let i = 0; i < 50; i++) {
      const firstName = randomElement(firstNames);
      const lastName = randomElement(lastNames);
      const visaStatus = randomElement(visaStatuses);
      const experienceYears = randomNumber(2, 15);
      const hourlyRate = randomNumber(50, 120);

      candidates.push({
        first_name: firstName,
        last_name: lastName,
        phone_number: generatePhone(),
        email_address: generateEmail(firstName, lastName, i),
        linkedin_url: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
        current_location: randomElement(cities),
        relocation_preference: randomElement(['Open to relocation', 'No relocation', 'Remote only', 'Specific cities only']),
        visa_status_id: visaStatus.visa_status_id,
        visa_expiry_date: visaStatus.visa_name !== 'USC' && visaStatus.visa_name !== 'Green Card'
          ? randomDate(new Date(2024, 0, 1), new Date(2027, 11, 31)).toISOString().split('T')[0]
          : null,
        total_experience_years: experienceYears,
        skills_primary: randomElement(skills),
        skills_secondary: randomElement(skills),
        preferred_roles: randomElement(roles),
        hourly_pay_rate: hourlyRate,
        salary_annual: hourlyRate * 2080,
        bench_status: randomElement(['available', 'on_bench', 'placed']),
        bench_added_date: randomDate(new Date(2024, 0, 1), new Date()).toISOString().split('T')[0],
        sales_manager_id: insertedUsers?.find(u => u.role_id === roles.find(r => r.role_name === 'Sales Manager')?.role_id)?.user_id,
        sales_executive_id: insertedUsers?.find(u => u.role_id === roles.find(r => r.role_name === 'Sales Executive')?.role_id)?.user_id,
        recruiter_manager_id: insertedUsers?.find(u => u.role_id === roles.find(r => r.role_name === 'Recruiter Manager')?.role_id)?.user_id,
        recruiter_executive_id: insertedUsers?.find(u => u.role_id === roles.find(r => r.role_name === 'Recruiter Executive')?.role_id)?.user_id,
        notes_internal: `Experienced ${randomElement(['professional', 'developer', 'engineer', 'consultant'])} with strong ${randomElement(['technical', 'communication', 'leadership', 'analytical'])} skills.`,
        created_by: insertedUsers[0]?.user_id
      });
    }

    const { data: insertedCandidates, error: candidateError } = await supabase
      .from('candidates')
      .insert(candidates)
      .select();

    if (candidateError) {
      console.error('❌ Error creating candidates:', candidateError.message);
    } else {
      console.log(`✅ Created ${insertedCandidates.length} candidates`);
    }

    // 5. Create Job Requirements
    console.log('📋 Creating job requirements...');
    const jobs = [];

    for (let i = 0; i < 30; i++) {
      const vendor = randomElement(insertedVendors);
      const client = randomElement(insertedClients);
      const minRate = randomNumber(60, 100);
      const maxRate = minRate + randomNumber(10, 30);

      jobs.push({
        job_title: randomElement(jobTitles),
        job_description: `Looking for an experienced professional with strong technical skills. Must have excellent communication and problem-solving abilities.`,
        skills_required: randomElement(skills),
        vendor_id: vendor.vendor_id,
        client_id: client.client_id,
        location: randomElement(cities),
        work_mode: randomElement(['Remote', 'Hybrid', 'Onsite']),
        bill_rate_range_min: minRate,
        bill_rate_range_max: maxRate,
        employment_type: randomElement(['W2', 'C2C', '1099', 'Contract']),
        duration: randomElement(['3 months', '6 months', '12 months', '18 months', 'Permanent']),
        priority: randomElement(['Low', 'Medium', 'High', 'Urgent']),
        received_date: randomDate(new Date(2024, 0, 1), new Date()).toISOString().split('T')[0],
        expiry_date: randomDate(new Date(), new Date(2025, 11, 31)).toISOString().split('T')[0],
        status: randomElement(['open', 'open', 'open', 'on_hold', 'filled']), // More likely to be open
        notes: 'Great opportunity with a leading client.',
        created_by: insertedUsers[0]?.user_id
      });
    }

    const { data: insertedJobs, error: jobError } = await supabase
      .from('job_requirements')
      .insert(jobs)
      .select();

    if (jobError) {
      console.error('❌ Error creating jobs:', jobError.message);
    } else {
      console.log(`✅ Created ${insertedJobs.length} job requirements`);
    }

    // 6. Create Submissions
    console.log('📤 Creating submissions...');
    const submissions = [];

    for (let i = 0; i < 40; i++) {
      const candidate = randomElement(insertedCandidates);
      const job = randomElement(insertedJobs);
      const payRate = candidate.hourly_pay_rate;
      const billRate = payRate + randomNumber(15, 35);

      submissions.push({
        candidate_id: candidate.candidate_id,
        job_id: job.job_id,
        submitted_by_user_id: insertedUsers[0]?.user_id,
        submission_status: randomElement(['submitted', 'screening', 'shortlisted', 'interview_scheduled', 'offered', 'rejected']),
        bill_rate_offered: billRate,
        pay_rate_offered: payRate,
        margin: billRate - payRate,
        notes: 'Candidate profile matches job requirements well.',
        submitted_at: randomDate(new Date(2024, 0, 1), new Date()).toISOString()
      });
    }

    const { data: insertedSubmissions, error: submissionError } = await supabase
      .from('submissions')
      .insert(submissions)
      .select();

    if (submissionError) {
      console.error('❌ Error creating submissions:', submissionError.message);
    } else {
      console.log(`✅ Created ${insertedSubmissions.length} submissions`);
    }

    // 7. Create Interviews
    console.log('📅 Creating interviews...');
    const interviews = [];

    // Only create interviews for submissions that are shortlisted or interview_scheduled
    const interviewableSubmissions = insertedSubmissions.filter(
      s => ['shortlisted', 'interview_scheduled', 'offered'].includes(s.submission_status)
    );

    for (const submission of interviewableSubmissions) {
      interviews.push({
        submission_id: submission.submission_id,
        interview_round: randomElement(['Round 1 - Phone Screen', 'Round 2 - Technical', 'Round 3 - Manager', 'Round 4 - Final']),
        scheduled_time: randomDate(new Date(), new Date(2025, 2, 31)).toISOString(),
        interviewer_name: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
        interviewer_email: `interviewer${randomNumber(1, 100)}@client.com`,
        interview_mode: randomElement(['Phone', 'Video', 'In-Person', 'Technical']),
        meeting_link: 'https://zoom.us/j/' + randomNumber(100000000, 999999999),
        result: randomElement(['Passed', 'Failed', 'Pending', 'Pending', 'Pending']), // More likely pending
        rating: randomNumber(3, 5)
      });
    }

    if (interviews.length > 0) {
      const { data: insertedInterviews, error: interviewError } = await supabase
        .from('interviews')
        .insert(interviews)
        .select();

      if (interviewError) {
        console.error('❌ Error creating interviews:', interviewError.message);
      } else {
        console.log(`✅ Created ${insertedInterviews.length} interviews`);
      }
    } else {
      console.log('⏭️  No interviews to create');
    }

    // 8. Create Projects (Placements)
    console.log('🚀 Creating projects...');
    const projects = [];

    // Create projects for placed candidates
    const placedCandidates = insertedCandidates.filter(c => c.bench_status === 'placed').slice(0, 15);

    for (const candidate of placedCandidates) {
      const client = randomElement(insertedClients);
      const vendor = randomElement(insertedVendors);
      const payRate = candidate.hourly_pay_rate;
      const billRate = payRate + randomNumber(20, 40);
      const startDate = randomDate(new Date(2023, 0, 1), new Date(2024, 6, 1));

      projects.push({
        candidate_id: candidate.candidate_id,
        client_id: client.client_id,
        vendor_id: vendor.vendor_id,
        project_name: `${client.client_name} - ${randomElement(jobTitles)} Project`,
        start_date: startDate.toISOString().split('T')[0],
        end_date: randomDate(new Date(2025, 0, 1), new Date(2025, 11, 31)).toISOString().split('T')[0],
        bill_rate_final: billRate,
        pay_rate_final: payRate,
        margin: billRate - payRate,
        po_number: `PO-${randomNumber(10000, 99999)}`,
        client_manager_name: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
        client_manager_email: `manager@${client.client_name.toLowerCase().replace(/\s+/g, '').replace(/&/g, 'and')}.com`,
        timesheet_portal: randomElement(['Fieldglass', 'Beeline', 'IQNavigator', 'Client Portal']),
        timesheet_cycle: randomElement(['Weekly', 'Bi-Weekly', 'Monthly']),
        status: randomElement(['active', 'active', 'completed', 'on_hold']), // More likely active
        notes: 'Project running smoothly.',
        created_by: insertedUsers[0]?.user_id
      });
    }

    if (projects.length > 0) {
      const { data: insertedProjects, error: projectError } = await supabase
        .from('projects')
        .insert(projects)
        .select();

      if (projectError) {
        console.error('❌ Error creating projects:', projectError.message);
      } else {
        console.log(`✅ Created ${insertedProjects.length} projects`);

        // 9. Create Timesheets
        console.log('⏰ Creating timesheets...');
        const timesheets = [];

        for (const project of insertedProjects.slice(0, 10)) {
          // Create 4 timesheets per project
          for (let week = 0; week < 4; week++) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (week * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            timesheets.push({
              project_id: project.project_id,
              candidate_id: project.candidate_id,
              week_start: weekStart.toISOString().split('T')[0],
              week_end: weekEnd.toISOString().split('T')[0],
              hours_worked: 40,
              regular_hours: 40,
              overtime_hours: 0,
              approved_by_client: randomElement([true, false]),
              submitted_date: weekStart.toISOString().split('T')[0]
            });
          }
        }

        const { data: insertedTimesheets, error: timesheetError } = await supabase
          .from('timesheets')
          .insert(timesheets)
          .select();

        if (timesheetError) {
          console.error('❌ Error creating timesheets:', timesheetError.message);
        } else {
          console.log(`✅ Created ${insertedTimesheets.length} timesheets`);
        }

        // 10. Create Invoices
        console.log('💰 Creating invoices...');
        const invoices = [];

        for (let i = 0; i < 15; i++) {
          const project = randomElement(insertedProjects);
          const amount = project.bill_rate_final * 160; // Monthly invoice

          invoices.push({
            project_id: project.project_id,
            client_id: project.client_id,
            invoice_number: `INV-2024-${String(i + 1).padStart(5, '0')}`,
            invoice_amount: amount,
            invoice_date: randomDate(new Date(2024, 0, 1), new Date()).toISOString().split('T')[0],
            payment_due_date: randomDate(new Date(), new Date(2025, 2, 31)).toISOString().split('T')[0],
            status: randomElement(['draft', 'sent', 'paid', 'overdue']),
            notes: 'Invoice for services rendered.',
            created_by: insertedUsers[0]?.user_id
          });
        }

        const { data: insertedInvoices, error: invoiceError } = await supabase
          .from('invoices')
          .insert(invoices)
          .select();

        if (invoiceError) {
          console.error('❌ Error creating invoices:', invoiceError.message);
        } else {
          console.log(`✅ Created ${insertedInvoices.length} invoices`);
        }
      }
    } else {
      console.log('⏭️  No projects to create');
    }

    // 11. Create Notes for candidates
    console.log('📝 Creating notes...');
    const notes = [];

    for (let i = 0; i < 30; i++) {
      const candidate = randomElement(insertedCandidates);

      notes.push({
        entity_type: 'candidates',
        entity_id: candidate.candidate_id,
        note_text: randomElement([
          'Had a great conversation. Very enthusiastic about the opportunity.',
          'Follow up next week regarding visa status.',
          'Candidate is actively interviewing with other companies.',
          'Strong technical background. Would be a great fit.',
          'Rate expectations are a bit high. Needs negotiation.',
          'Available to start immediately.',
          'Requires remote work only.',
          'Looking for long-term contract opportunities.'
        ]),
        note_type: randomElement(['general', 'important', 'follow_up', 'call']),
        is_pinned: randomElement([true, false]),
        created_by: insertedUsers[0]?.user_id
      });
    }

    const { data: insertedNotes, error: noteError } = await supabase
      .from('notes')
      .insert(notes)
      .select();

    if (noteError) {
      console.error('❌ Error creating notes:', noteError.message);
    } else {
      console.log(`✅ Created ${insertedNotes.length} notes`);
    }

    console.log('\n🎉 Mock data seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Users: ${insertedUsers?.length || 0}`);
    console.log(`   - Vendors: ${insertedVendors?.length || 0}`);
    console.log(`   - Clients: ${insertedClients?.length || 0}`);
    console.log(`   - Candidates: ${insertedCandidates?.length || 0}`);
    console.log(`   - Job Requirements: ${insertedJobs?.length || 0}`);
    console.log(`   - Submissions: ${insertedSubmissions?.length || 0}`);
    console.log(`   - Notes: ${insertedNotes?.length || 0}`);
    console.log('\n✅ You can now run: npm run dev');
    console.log('🌐 Visit: http://localhost:3000\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedMockData();
}

module.exports = { seedMockData };
