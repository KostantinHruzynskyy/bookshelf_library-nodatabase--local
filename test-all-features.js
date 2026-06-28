'use strict';
const http = require('http');

const BASE = 'http://localhost:3000';
let tests = { passed: 0, failed: 0, errors: [] };

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (body && typeof body === 'object') req.write(JSON.stringify(body));
    else if (body) req.write(body);
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    tests.passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    tests.failed++;
    tests.errors.push({ name, error: e.message });
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runTests() {
  console.log('\n🧪 COMPREHENSIVE FEATURE TEST\n' + '='.repeat(60));
  
  // Test CSS on all pages
  console.log('\n🎨 CSS Loading');
  const pages = ['/', '/login.html', '/register.html', '/dashboard.html', '/profile.html', '/admin.html', '/reader.html'];
  
  for (const page of pages) {
    await test(`Page ${page} has CSS`, async () => {
      const res = await request('GET', page);
      assert(res.raw.includes('/css/style.css'), 'CSS link missing');
    });
  }
  
  console.log('\n✅ Basic tests complete!');
}

runTests().catch(e => console.error(e));