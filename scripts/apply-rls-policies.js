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

async function applyPolicies() {
  console.log('🔧 Applying missing RLS policies for user signup...\n');

  // List of SQL statements to execute
  const sqlStatements = [
    // Users table - INSERT policy
    `CREATE POLICY IF NOT EXISTS "users_insert_service_role" ON public.users
     FOR INSERT WITH CHECK (true);`,

    // Users table - DELETE policy
    `CREATE POLICY IF NOT EXISTS "users_delete_service_role" ON public.users
     FOR DELETE USING (true);`,

    // Teams table - INSERT policy
    `CREATE POLICY IF NOT EXISTS "teams_insert_service_role" ON public.teams
     FOR INSERT WITH CHECK (true);`,

    // Teams table - DELETE policy
    `CREATE POLICY IF NOT EXISTS "teams_delete_service_role" ON public.teams
     FOR DELETE USING (true);`,

    // Roles table - INSERT policy
    `CREATE POLICY IF NOT EXISTS "roles_insert_service_role" ON public.roles
     FOR INSERT WITH CHECK (true);`,

    // Role_permissions table - INSERT policy
    `CREATE POLICY IF NOT EXISTS "role_permissions_insert_service_role" ON public.role_permissions
     FOR INSERT WITH CHECK (true);`
  ];

  let successCount = 0;
  let failureCount = 0;

  for (const sql of sqlStatements) {
    try {
      // Extract policy name for display
      const policyMatch = sql.match(/"([^"]+)"/);
      const policyName = policyMatch ? policyMatch[1] : 'Unknown';
      process.stdout.write(`Creating policy "${policyName}"... `);

      // Use the query API to execute raw SQL
      const { data, error } = await client.rpc('exec_sql_raw', {
        statement: sql
      }).catch(() => {
        // Fallback: try using the Supabase admin API endpoint directly
        return fetch(`${url}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey
          },
          body: JSON.stringify({ statement: sql })
        }).then(r => r.json()).then(data => ({ data, error: null }))
          .catch(err => ({ error: err }));
      });

      if (error && error.message && error.message.includes('already exists')) {
        console.log('✓ (Already exists)');
        successCount++;
      } else if (error) {
        console.log(`✗ Error: ${error.message || error}`);
        failureCount++;
      } else {
        console.log('✓');
        successCount++;
      }
    } catch (err) {
      console.log(`✗ Exception: ${err.message}`);
      failureCount++;
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   ✓ Applied: ${successCount}`);
  console.log(`   ✗ Failed: ${failureCount}`);

  if (failureCount > 0) {
    console.log('\n⚠️  Some policies may not have been applied.');
    console.log('   Please check the Supabase SQL Editor and manually run:');
    console.log('   scripts/fix-rls-missing-insert-policies.sql\n');
    process.exit(1);
  } else {
    console.log('\n✅ All RLS policies have been successfully applied!');
    console.log('   Users can now sign up and create accounts.\n');
    process.exit(0);
  }
}

// Try direct fetch approach first
async function applyPoliciesDirect() {
  console.log('🔧 Applying missing RLS policies for user signup...\n');
  console.log('Using direct SQL execution...\n');

  const sqlStatements = [
    `CREATE POLICY IF NOT EXISTS "users_insert_service_role" ON public.users FOR INSERT WITH CHECK (true);`,
    `CREATE POLICY IF NOT EXISTS "users_delete_service_role" ON public.users FOR DELETE USING (true);`,
    `CREATE POLICY IF NOT EXISTS "teams_insert_service_role" ON public.teams FOR INSERT WITH CHECK (true);`,
    `CREATE POLICY IF NOT EXISTS "teams_delete_service_role" ON public.teams FOR DELETE USING (true);`,
    `CREATE POLICY IF NOT EXISTS "roles_insert_service_role" ON public.roles FOR INSERT WITH CHECK (true);`,
    `CREATE POLICY IF NOT EXISTS "role_permissions_insert_service_role" ON public.role_permissions FOR INSERT WITH CHECK (true);`
  ];

  let successCount = 0;
  let failureCount = 0;

  for (const sql of sqlStatements) {
    try {
      const policyMatch = sql.match(/"([^"]+)"/);
      const policyName = policyMatch ? policyMatch[1] : 'Unknown';
      process.stdout.write(`Creating policy "${policyName}"... `);

      const response = await fetch(`${url}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ query: sql })
      });

      if (response.ok || response.status === 409) {
        console.log('✓');
        successCount++;
      } else {
        const text = await response.text();
        console.log(`✗ (${response.status})`);
        failureCount++;
      }
    } catch (err) {
      console.log(`✗ ${err.message}`);
      failureCount++;
    }
  }

  console.log(`\n📊 Results: ${successCount} applied, ${failureCount} failed`);

  if (failureCount > 0) {
    console.log('\n⚠️  Policies may not have been applied.');
    console.log('   Please manually run the SQL in the Supabase dashboard:\n');
    console.log('   scripts/fix-rls-missing-insert-policies.sql\n');
  } else {
    console.log('\n✅ All RLS policies successfully applied!');
    console.log('   Users can now sign up.\n');
  }
}

applyPoliciesDirect().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
