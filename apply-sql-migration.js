#!/usr/bin/env node

/**
 * Apply SQL to Supabase using SQL Editor API
 * This reads and executes SQL files directly
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

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
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, rawError: true });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function executeSqlStatements(statements) {
  console.log(`\n📍 Executing ${statements.length} SQL statements...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();
    if (!statement) continue;

    // Show first 80 chars of statement
    const preview = statement.substring(0, 80).replace(/\n/g, ' ');
    process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}... `);

    try {
      // Use the query endpoint with the SQL
      const response = await makeRequest('POST', '/rest/v1/rpc/query', {
        query: statement
      });

      if (response.status === 200 || response.status === 201) {
        console.log('✓');
        successCount++;
      } else {
        console.log(`✗ (${response.status})`);
        if (response.data && response.data.message) {
          console.log(`     Error: ${response.data.message}`);
        }
        errorCount++;
      }
    } catch (error) {
      console.log(`✗ (${error.message})`);
      errorCount++;
    }

    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n📊 Results: ${successCount} succeeded, ${errorCount} failed\n`);
  return errorCount === 0;
}

async function applyMigrations() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║    APPLYING SQL MIGRATIONS TO SUPABASE             ║');
  console.log('╚════════════════════════════════════════════════════╝');

  const migrationDir = path.join(__dirname, 'supabase', 'migrations');
  const files = [
    '20251223_create_role_templates.sql',
    '20251223_populate_role_templates.sql'
  ];

  for (const file of files) {
    const filePath = path.join(migrationDir, file);

    console.log(`\n📋 File: ${file}`);

    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  File not found at ${filePath}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');

    // Split SQL into statements
    // Remove comments and split by semicolon
    const cleaned = content
      .split('\n')
      .filter(line => !line.trim().startsWith('--')) // Remove comment lines
      .join('\n');

    const statements = cleaned
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`   Found ${statements.length} statements`);

    const success = await executeSqlStatements(statements);

    if (!success) {
      console.log(`\n⚠️  Some statements failed. Continuing anyway...\n`);
    }
  }

  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║           MIGRATION APPLICATION COMPLETE           ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
}

applyMigrations().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
