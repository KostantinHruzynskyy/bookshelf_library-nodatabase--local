'use strict';

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
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
    req.on('error', (err) => reject(err));
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function test() {
  console.log('🧪 Testing server...\n');

  try {
    // Test 1: Homepage
    console.log('1. Testing homepage...');
    const home = await request('/');
    console.log('   Status:', home.status);
    console.log('   Result:', home.status === 200 ? '✅ OK' : '❌ FAIL');

    // Test 2: Login page
    console.log('\n2. Testing login page...');
    const loginPage = await request('/login.html');
    console.log('   Status:', loginPage.status);
    console.log('   Result:', loginPage.status === 200 ? '✅ OK' : '❌ FAIL');

    // Test 3: Register page
    console.log('\n3. Testing register page...');
    const regPage = await request('/register.html');
    console.log('   Status:', regPage.status);
    console.log('   Result:', regPage.status === 200 ? '✅ OK' : '❌ FAIL');

    // Test 4: Health endpoint
    console.log('\n4. Testing health endpoint...');
    const health = await request('/api/health');
    console.log('   Status:', health.status);
    console.log('   Result:', health.status === 200 ? '✅ OK' : '❌ FAIL');

    // Test 5: Books API
    console.log('\n5. Testing books API...');
    const books = await request('/api/books');
    console.log('   Status:', books.status);
    console.log('   Result:', books.status === 200 ? '✅ OK' : '❌ FAIL');

    // Test 6: Admin login
    console.log('\n6. Testing admin login...');
    const login = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'admin@bookshelf.com', password: 'admin123' }
    });
    console.log('   Status:', login.status);
    console.log('   Response:', JSON.stringify(login.data).substring(0, 100));
    console.log('   Result:', login.status === 200 ? '✅ OK' : '❌ FAIL');

    if (login.status === 200 && login.data.ok) {
      console.log('\n✅ Admin login successful!');
      console.log('   Cookie:', login.headers['set-cookie'] ? 'Received' : 'Missing');
    }

    console.log('\n' + '='.repeat(50));
    console.log('Tests complete!');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.log('Make sure the server is running: npm start');
  }

  process.exit(0);
}

test();