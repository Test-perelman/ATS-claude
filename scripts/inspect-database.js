#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const https = require('https');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(supabaseUrl);
    const options = {
      method,
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(`${supabaseUrl}${path}`, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function inspectDatabase() {
  try {
    console.log('🔗 Connecting to Supabase...\n');

    // Use the REST API to get table info
    const projectRef = supabaseUrl.split('//')[1].split('.')[0];

    // Get tables
    const response = await makeRequest('GET', '/rest/v1/?apiVersion=2024-01-01');

    console.log(`✅ Connected to Supabase\n`);
    console.log(`📊 Database Project: ${projectRef}\n`);

    // Try to list available tables using information_schema
    const tablesResponse = await makeRequest('GET', '/rest/v1/information_schema.tables?table_schema=eq.public');

    if (tablesResponse.status === 200 && Array.isArray(tablesResponse.data)) {
      console.log(`Found ${tablesResponse.data.length} tables:\n`);

      const tables = tablesResponse.data;

      for (const table of tables) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📋 TABLE: ${table.table_name}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        // Get columns
        const columnsResponse = await makeRequest('GET', `/rest/v1/information_schema.columns?table_name=eq.${table.table_name}&table_schema=eq.public`);

        if (columnsResponse.status === 200 && Array.isArray(columnsResponse.data)) {
          console.log(`\n${columnsResponse.data.length} columns:\n`);

          columnsResponse.data.forEach((col, idx) => {
            const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
            const defaultVal = col.column_default ? ` = ${col.column_default}` : '';
            console.log(`  ${idx + 1}. ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${nullable}${defaultVal}`);
          });
        }
      }
    } else {
      console.error('Could not fetch table information from REST API');
      console.error('Response:', tablesResponse);
    }

    console.log(`\n\n✨ Database inspection complete!\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

inspectDatabase();
