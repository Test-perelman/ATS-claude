const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://awujhuncfghjshggkqyo.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: 'public' },
});

async function test() {
  try {
    // Try to insert a test master admin
    const testId = 'ce3b9c96-f425-41aa-b13b-d6c418b00241'; // Latest master admin ID from our run
    
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: testId,
        email: 'test-master-admin@test.local',
        team_id: null,
        role_id: null,
        is_master_admin: true,
      })
      .select()
      .single();

    if (error) {
      console.log('Insert error:', error.code, error.message);
      console.log('Full error:', JSON.stringify(error, null, 2));
    } else {
      console.log('Success:', JSON.stringify(data, null, 2));
    }

    // Now try to SELECT to see what's actually in the database
    const { data: existing, error: selectError } = await supabase
      .from('users')
      .select('id, email, is_master_admin')
      .eq('id', testId);

    if (selectError) {
      console.log('Select error:', selectError);
    } else {
      console.log('Existing record:', JSON.stringify(existing, null, 2));
    }

  } catch (error) {
    console.error('Fatal:', error);
  }
}

test();
