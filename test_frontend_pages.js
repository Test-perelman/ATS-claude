#!/usr/bin/env node

/**
 * TEST FRONTEND PAGES
 * Test all important pages are accessible and loading correctly
 */

const http = require('http');

const pages = [
  { url: 'http://localhost:3001/auth/login', name: 'Login Page', key: 'Sign In' },
  { url: 'http://localhost:3001/auth/signup', name: 'Signup Page', key: 'Create Account' },
  { url: 'http://localhost:3001/onboarding', name: 'Onboarding Page', key: 'onboarding' },
];

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

async function testPage(pageUrl, pageName, searchKey) {
  return new Promise((resolve) => {
    const url = new URL(pageUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const found = data.includes(searchKey);
        if (found) {
          log(colors.green, `✅ ${pageName} - LOADED`);
          log(colors.yellow, `   URL: ${pageUrl}`);
          log(colors.yellow, `   Found: "${searchKey}"\n`);
        } else {
          log(colors.red, `❌ ${pageName} - FAILED`);
          log(colors.yellow, `   Could not find "${searchKey}" in response\n`);
        }
        resolve(found);
      });
    });

    req.on('error', (err) => {
      log(colors.red, `❌ ${pageName} - ERROR`);
      log(colors.yellow, `   ${err.message}\n`);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      log(colors.red, `❌ ${pageName} - TIMEOUT\n`);
      resolve(false);
    });

    req.end();
  });
}

(async () => {
  log(colors.cyan, '\n═══════════════════════════════════════════════════════════');
  log(colors.cyan, '  FRONTEND PAGE TESTS');
  log(colors.cyan, '═══════════════════════════════════════════════════════════\n');

  let passed = 0;
  let total = pages.length;

  for (const page of pages) {
    const result = await testPage(page.url, page.name, page.key);
    if (result) passed++;
  }

  log(colors.cyan, '═══════════════════════════════════════════════════════════');
  log(colors.green, `✅ TESTS PASSED: ${passed}/${total}`);
  log(colors.cyan, '═══════════════════════════════════════════════════════════\n');

  process.exit(passed === total ? 0 : 1);
})();
