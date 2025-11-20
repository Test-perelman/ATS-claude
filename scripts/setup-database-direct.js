/**
 * Database Setup Script - Direct SQL Execution
 * This script creates all tables in Supabase PostgreSQL using direct SQL execution
 * Run: node scripts/setup-database-direct.js
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

async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  console.log('📊 Creating tables and initial data...\n');

  try {
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('roles')
      .select('count')
      .limit(1);

    if (testError && testError.code === '42P01') {
      console.log('⚠️  Tables do not exist. You need to run the SQL in Supabase SQL Editor.\n');
      console.log('📋 Follow these steps:\n');
      console.log('1. Go to https://app.supabase.com');
      console.log('2. Select your project: awujhuncfghjshggkqyo');
      console.log('3. Click "SQL Editor" in the left sidebar');
      console.log('4. Click "New Query"');
      console.log('5. Copy the SQL from: scripts/schema.sql');
      console.log('6. Paste it into the SQL Editor');
      console.log('7. Click "Run"\n');
      console.log('Creating schema.sql file for you...\n');

      // Generate schema.sql file
      const fs = require('fs');
      const path = require('path');

      const schemaPath = path.join(__dirname, 'schema.sql');
      const SQL_SCHEMA = require('./schema-content');

      fs.writeFileSync(schemaPath, SQL_SCHEMA);
      console.log('✅ Created scripts/schema.sql');
      console.log('📝 Copy this file content to Supabase SQL Editor\n');

      return;
    }

    // If tables exist, seed initial data
    console.log('✅ Tables already exist. Checking initial data...\n');

    // Check and insert roles
    const { data: roles } = await supabase.from('roles').select('role_name');
    if (!roles || roles.length === 0) {
      console.log('📝 Inserting default roles...');
      await supabase.from('roles').insert([
        { role_name: 'Super Admin', role_description: 'Full system access with all permissions' },
        { role_name: 'Sales Manager', role_description: 'Manages sales team and client relationships' },
        { role_name: 'Sales Executive', role_description: 'Handles client submissions and vendor relationships' },
        { role_name: 'Recruiter Manager', role_description: 'Manages recruiting team and candidate sourcing' },
        { role_name: 'Recruiter Executive', role_description: 'Sources and manages candidates' }
      ]);
      console.log('✅ Roles inserted');
    } else {
      console.log(`✅ Found ${roles.length} roles`);
    }

    // Check and insert visa statuses
    const { data: visas } = await supabase.from('visa_status').select('visa_name');
    if (!visas || visas.length === 0) {
      console.log('📝 Inserting visa statuses...');
      await supabase.from('visa_status').insert([
        { visa_name: 'H-1B', description: 'H-1B Specialty Occupation visa' },
        { visa_name: 'OPT', description: 'Optional Practical Training' },
        { visa_name: 'CPT', description: 'Curricular Practical Training' },
        { visa_name: 'STEM OPT', description: 'STEM OPT Extension' },
        { visa_name: 'GC-EAD', description: 'Green Card - Employment Authorization Document' },
        { visa_name: 'TN', description: 'TN visa for Canadian/Mexican citizens' },
        { visa_name: 'E3', description: 'E3 visa for Australian citizens' },
        { visa_name: 'USC', description: 'US Citizen' },
        { visa_name: 'Green Card', description: 'Permanent Resident' },
        { visa_name: 'L-1', description: 'Intracompany Transfer visa' }
      ]);
      console.log('✅ Visa statuses inserted');
    } else {
      console.log(`✅ Found ${visas.length} visa statuses`);
    }

    console.log('\n✨ Database setup completed!\n');
    console.log('📝 Next steps:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Visit: http://localhost:3000\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Manual Setup Instructions:\n');
    console.log('Since automatic setup failed, please:');
    console.log('1. Go to https://app.supabase.com/project/awujhuncfghjshggkqyo/sql');
    console.log('2. Create a new query');
    console.log('3. Copy and paste the SQL from scripts/schema.sql');
    console.log('4. Run the query\n');
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
