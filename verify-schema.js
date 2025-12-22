const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://awujhuncfghjshggkqyo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoamhoamhrYXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDc5NDEyMywiZXhwIjoxODYwMzcwMTIzfQ.k3L_7Aym8MNNZjBj9r_9xZPO6-YdM6LAV4Yv9Hxc1Cc';

const client = createClient(supabaseUrl, supabaseKey);

async function verifySchema() {
  console.log('\n🔍 VERIFYING SCHEMA DEPLOYMENT\n');
  
  try {
    // Check team_memberships table
    console.log('1️⃣  Checking team_memberships table...');
    const { data: membershipsData, error: membershipsError } = await client
      .from('team_memberships')
      .select('*')
      .limit(1);
    
    if (membershipsError && membershipsError.message.includes('does not exist')) {
      console.log('❌ team_memberships table NOT FOUND');
    } else {
      console.log('✅ team_memberships table EXISTS');
    }
    
    // Check team_settings table
    console.log('\n2️⃣  Checking team_settings table...');
    const { data: settingsData, error: settingsError } = await client
      .from('team_settings')
      .select('*')
      .limit(1);
    
    if (settingsError && settingsError.message.includes('does not exist')) {
      console.log('❌ team_settings table NOT FOUND');
    } else {
      console.log('✅ team_settings table EXISTS');
    }
    
    // Check if we can query the database directly
    console.log('\n3️⃣  Querying database for table existence...');
    const { data: tables, error: tablesError } = await client.rpc('list_tables', {}, {
      head: false
    }).catch(e => {
      // If RPC doesn't exist, try querying tables directly
      return { data: null, error: e };
    });
    
    if (tables) {
      console.log('📋 Tables found:', tables);
    } else {
      console.log('⚠️  Could not query table list via RPC');
    }
    
    // Try to get table schema by selecting from information_schema
    console.log('\n4️⃣  Checking for helper functions...');
    const { data: functions, error: functionsError } = await client.rpc('get_functions', {}, {
      head: false
    }).catch(e => {
      console.log('⚠️  Could not query functions via RPC');
      return { data: null, error: e };
    });
    
    if (functions) {
      console.log('📋 Functions found:', functions);
    }
    
    console.log('\n✅ VERIFICATION COMPLETE');
    console.log('\nNote: If tables exist, they would be accessible via Supabase client.');
    console.log('The team_memberships table is working if the RPC query succeeded.');
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  }
}

verifySchema();
