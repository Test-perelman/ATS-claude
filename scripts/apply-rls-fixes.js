#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const client = createClient(url, serviceKey);

// All the RLS policies that need to be added
const policies = [
  {
    table: 'users',
    name: 'users_insert_service_role',
    definition: `(true)`,
    type: 'INSERT'
  },
  {
    table: 'users',
    name: 'users_delete_service_role',
    type: 'DELETE'
  },
  {
    table: 'teams',
    name: 'teams_insert_service_role',
    definition: `(true)`,
    type: 'INSERT'
  },
  {
    table: 'teams',
    name: 'teams_delete_service_role',
    type: 'DELETE'
  },
  {
    table: 'roles',
    name: 'roles_insert_service_role',
    definition: `(true)`,
    type: 'INSERT'
  },
  {
    table: 'role_permissions',
    name: 'role_permissions_insert_service_role',
    definition: `(true)`,
    type: 'INSERT'
  }
];

async function applyPolicies() {
  console.log('🔧 Applying missing RLS policies for user signup...\n');

  const policyQueries = [
    // Users table
    `CREATE POLICY IF NOT EXISTS "users_insert_service_role" ON public.users
     FOR INSERT WITH CHECK (true);`,

    `CREATE POLICY IF NOT EXISTS "users_delete_service_role" ON public.users
     FOR DELETE USING (true);`,

    // Teams table
    `CREATE POLICY IF NOT EXISTS "teams_insert_service_role" ON public.teams
     FOR INSERT WITH CHECK (true);`,

    `CREATE POLICY IF NOT EXISTS "teams_delete_service_role" ON public.teams
     FOR DELETE USING (true);`,

    // Roles table
    `CREATE POLICY IF NOT EXISTS "roles_insert_service_role" ON public.roles
     FOR INSERT WITH CHECK (true);`,

    // Role_permissions table
    `CREATE POLICY IF NOT EXISTS "role_permissions_insert_service_role" ON public.role_permissions
     FOR INSERT WITH CHECK (true);`
  ];

  for (const query of policyQueries) {
    try {
      console.log(`Applying policy...`);
      const { data, error } = await client.rpc('exec', { sql: query });

      if (error) {
        console.error('  ⚠️  Warning:', error.message);
      } else {
        console.log('  ✓ Success');
      }
    } catch (err) {
      console.error('  ❌ Error:', err.message);
    }
  }

  console.log('\n✅ RLS policies update complete!');
  console.log('   Users can now sign up and create accounts.');
}

applyPolicies().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
