const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://awujhuncfghjshggkqyo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

(async () => {
  try {
    console.log('\n🔍 Checking team_access_requests table status...\n');

    // Test 1: Try to select from the table
    console.log('1️⃣ Attempting to query team_access_requests...');
    const { data: queryTest, error: queryError } = await supabase
      .from('team_access_requests')
      .select('*')
      .limit(1);

    if (queryError) {
      console.log(`   ❌ Error: ${queryError.message}`);
      console.log(`   Code: ${queryError.code}\n`);

      if (queryError.code === 'PGRST116') {
        console.log('   → Table does NOT exist\n');
      } else if (queryError.message.includes('RLS')) {
        console.log('   → Table exists but RLS policy is blocking access\n');
      }
    } else {
      console.log(`   ✅ Query successful!`);
      console.log(`   Found ${queryTest?.length || 0} records\n`);
    }

    // Test 2: Try to insert a test record
    console.log('2️⃣ Attempting to insert a test record...');
    const testId = require('crypto').randomUUID?.() || `test-${Date.now()}`;

    const { data: insertTest, error: insertError } = await supabase
      .from('team_access_requests')
      .insert({
        email: `test_${Date.now()}@example.com`,
        requested_team_id: 'bad30f82-9404-4192-a355-97e2fcdf4032', // Use existing team
      })
      .select();

    if (insertError) {
      console.log(`   ❌ Insert Error: ${insertError.message}`);
      console.log(`   Code: ${insertError.code}\n`);

      if (insertError.code === 'PGRST116') {
        console.log('   → Table does NOT exist\n');
      } else if (insertError.message.includes('RLS')) {
        console.log('   → Table exists but RLS policy is blocking inserts\n');
      } else if (insertError.message.includes('syntax')) {
        console.log('   → Table definition has syntax errors\n');
      }
    } else {
      console.log(`   ✅ Insert successful!`);
      console.log(`   Inserted record ID: ${insertTest?.[0]?.id}\n`);
    }

    // Test 3: Check table structure
    console.log('3️⃣ Getting table column information...');
    const { data: columnTest, error: columnError } = await supabase
      .from('team_access_requests')
      .select('id, email, requested_team_id')
      .limit(1);

    if (!columnError) {
      console.log('   ✅ Table structure is valid');
      if (columnTest && columnTest.length > 0) {
        console.log('   Sample record structure:', Object.keys(columnTest[0]).join(', '));
      }
    } else if (columnError.code === 'PGRST116') {
      console.log('   ❌ Table does NOT exist');
    } else {
      console.log(`   ⚠️ Error: ${columnError.message}`);
    }

    console.log('\n═════════════════════════════════════════════════════════\n');

    // Summary
    if (!queryError && !insertError) {
      console.log('✅ TABLE IS FULLY OPERATIONAL\n');
      console.log('The team_access_requests table is working correctly.');
      console.log('No action needed.\n');
    } else if (queryError?.code === 'PGRST116' || insertError?.code === 'PGRST116') {
      console.log('❌ TABLE DOES NOT EXIST\n');
      console.log('You need to execute the corrected SQL in Supabase SQL Editor:');
      console.log('  supabase/migrations/20251224002_create_team_access_requests.sql\n');
      console.log('Steps:');
      console.log('  1. Go to Supabase Dashboard');
      console.log('  2. Click SQL Editor');
      console.log('  3. Click "New Query"');
      console.log('  4. Copy the entire content of the migration file');
      console.log('  5. Paste it into the editor');
      console.log('  6. Click "Run"\n');
    } else if (queryError || insertError) {
      console.log('⚠️ TABLE EXISTS BUT HAS ISSUES\n');
      console.log('The table might be partially created with syntax errors.');
      console.log('You may need to drop and recreate it.\n');
      console.log('Execute this to drop the table (if needed):');
      console.log('  DROP TABLE IF EXISTS public.team_access_requests CASCADE;\n');
      console.log('Then execute the corrected migration file.\n');
    }

  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
})();
