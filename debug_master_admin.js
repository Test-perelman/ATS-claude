const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://awujhuncfghjshggkqyo.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: 'public' },
});

async function debug() {
  try {
    // Query with service role (should NOT have RLS applied)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .like('email', '%master_admin_1766404874720%')
      .single();

    if (error) {
      console.error('Error:', error);
      process.exit(1);
    }

    console.log('Master admin record from database:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Fatal:', error);
    process.exit(1);
  }
}

debug();
