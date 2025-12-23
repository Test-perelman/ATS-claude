#!/usr/bin/env node

/**
 * Apply Migrations Script
 * Manually applies SQL migrations to Supabase
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://awujhuncfghjshggkqyo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxNzg2MiwiZXhwIjoyMDc5MTkzODYyfQ.gQYNYZQM4Wy9UwpTiWH_xO6srJGeXvPQfpwd89nEqr4';

function makeRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'awujhuncfghjshggkqyo.supabase.co',
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function executeSql(sql) {
  console.log('Executing SQL...');

  try {
    const res = await makeRequest('POST', '/rest/v1/rpc/exec_sql', {
      sql: sql
    });

    if (res.status === 200) {
      console.log('✓ SQL executed successfully');
      return true;
    } else {
      console.log(`✗ SQL execution failed: ${res.status}`);
      console.log(`  Response: ${JSON.stringify(res.data).substring(0, 500)}`);
      return false;
    }
  } catch (error) {
    console.log(`✗ Error executing SQL: ${error.message}`);
    return false;
  }
}

async function applyMigrations() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║         APPLYING MIGRATIONS TO SUPABASE           ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // Read migration files
  const migrationDir = path.join(__dirname, 'supabase', 'migrations');
  const files = [
    '20251223_create_role_templates.sql',
    '20251223_populate_role_templates.sql'
  ];

  for (const file of files) {
    const filePath = path.join(migrationDir, file);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${file}`);
      continue;
    }

    console.log(`\n📋 Applying: ${file}`);
    const sql = fs.readFileSync(filePath, 'utf8');

    // Split by statements and execute each one
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      const result = await executeSql(statement);
      if (!result) {
        console.log(`Error in statement:\n${statement}`);
        break;
      }
    }
  }

  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║                 MIGRATION COMPLETE                 ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
}

applyMigrations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
