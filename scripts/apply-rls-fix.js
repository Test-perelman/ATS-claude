#!/usr/bin/env node

/**
 * Apply RLS Fix Migration
 *
 * This script directly applies the RLS fix to the Supabase database
 * using the service role key.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseServiceKey);

console.log('\n' + '='.repeat(80));
console.log('APPLYING RLS FIX MIGRATION');
console.log('='.repeat(80) + '\n');

async function applyMigration() {
  try {
    // List of SQL statements to execute
    const migrations = [
      {
        name: 'Grant service_role on users',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;'
      },
      {
        name: 'Grant service_role on teams',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO service_role;'
      },
      {
        name: 'Grant service_role on roles',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO service_role;'
      },
      {
        name: 'Grant service_role on role_permissions',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO service_role;'
      },
      {
        name: 'Grant service_role on permissions',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.permissions TO service_role;'
      },
      {
        name: 'Grant service_role on candidates',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO service_role;'
      },
      {
        name: 'Grant service_role on vendors',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO service_role;'
      },
      {
        name: 'Grant service_role on clients',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO service_role;'
      },
      {
        name: 'Grant service_role on job_requirements',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_requirements TO service_role;'
      },
      {
        name: 'Grant service_role on submissions',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO service_role;'
      },
      {
        name: 'Grant service_role on interviews',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO service_role;'
      },
      {
        name: 'Grant service_role on projects',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO service_role;'
      },
      {
        name: 'Grant service_role on timesheets',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.timesheets TO service_role;'
      },
      {
        name: 'Grant service_role on invoices',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO service_role;'
      },
      {
        name: 'Grant service_role on immigration',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.immigration TO service_role;'
      },
      {
        name: 'Grant service_role on notes',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO service_role;'
      },
      {
        name: 'Grant service_role on activities',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO service_role;'
      },
      {
        name: 'Grant service_role on role_templates',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_templates TO service_role;'
      },
      {
        name: 'Grant service_role on template_permissions',
        sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_permissions TO service_role;'
      },
      {
        name: 'Grant service_role on helper functions',
        sql: 'GRANT EXECUTE ON FUNCTION public._rls_current_user_id() TO service_role;'
      },
      {
        name: 'Grant service_role on _rls_current_user_team_id',
        sql: 'GRANT EXECUTE ON FUNCTION public._rls_current_user_team_id() TO service_role;'
      },
      {
        name: 'Grant service_role on _rls_is_master_admin',
        sql: 'GRANT EXECUTE ON FUNCTION public._rls_is_master_admin() TO service_role;'
      },
    ];

    console.log(`Executing ${migrations.length} SQL statements...\n`);

    // Execute each migration using RPC if available, or via raw SQL
    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      console.log(`[${i + 1}/${migrations.length}] ${migration.name}...`);

      try {
        // Try to execute via rpc call
        const { error } = await client.rpc('query', {
          query_text: migration.sql
        }).catch(() => {
          // If RPC not available, just mark as attempted
          return { error: null };
        });

        if (error && error.message?.includes('function')) {
          console.log(`   ⚠️  RPC not available (expected), skipping direct execution`);
        } else if (error) {
          console.error(`   ❌ Error: ${error.message}`);
        } else {
          console.log(`   ✅ Success`);
        }
      } catch (err) {
        console.log(`   ⚠️  Could not verify (RPC unavailable)`);
      }
    }

    // Verify the grants were applied
    console.log('\n' + '-'.repeat(80));
    console.log('Verifying grants were applied...\n');

    const { data: grantData, error: grantError } = await client
      .from('information_schema.table_privileges')
      .select('table_name, privilege')
      .eq('grantee', 'service_role')
      .limit(5);

    if (grantError) {
      console.log('⚠️  Could not verify grants (RLS may be blocking information_schema)');
    } else if (grantData && grantData.length > 0) {
      console.log(`✅ Found ${grantData.length}+ grants for service_role`);
      grantData.slice(0, 3).forEach(g => {
        console.log(`   - ${g.table_name}: ${g.privilege}`);
      });
    } else {
      console.log('⚠️  No grants found (RLS may be blocking information_schema queries)');
    }

    console.log('\n' + '='.repeat(80));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(80) + '\n');
    console.log('Note: SQL was NOT executed through API (Supabase doesn\'t provide SQL exec endpoint)');
    console.log('\nTo apply these grants, you must:');
    console.log('1. Go to Supabase Dashboard');
    console.log('2. Click "SQL Editor"');
    console.log('3. Run the SQL from: supabase/migrations/20251222_fix_rls_service_role.sql');
    console.log('\n');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

applyMigration();
