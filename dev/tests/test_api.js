const http = require('http');

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function test() {
  console.log('🧪 Testing API...\n');

  // Test 1: Homepage
  console.log('1. GET /');
  const home = await request('/');
  console.log('   Status:', home.status);
  console.log('   Result:', home.status === 200 ? '✅ OK' : '❌ FAIL');

  // Test 2: Login page
  console.log('\n2. GET /login.html');
  const loginPage = await request('/login.html');
  console.log('   Status:', loginPage.status);
  console.log('   Result:', loginPage.status === 200 ? '✅ OK' : '❌ FAIL');

  // Test 3: Register page
  console.log('\n3. GET /register.html');
  const regPage = await request('/register.html');
  console.log('   Status:', regPage.status);
  console.log('   Result:', regPage.status === 200 ? '✅ OK' : '❌ FAIL');

  // Test 4: Admin login
  console.log('\n4. POST /api/auth/login');
  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'admin@bookshelf.com', password: 'admin123' }
  });
  console.log('   Status:', login.status);
  console.log('   Response:', JSON.stringify(login.data));
  console.log('   Result:', login.status === 200 && login.data.ok ? '✅ OK' : '❌ FAIL');

  if (login.status === 200 && login.data.ok) {
    console.log('\n✅ SUCCESS! Admin login works!');
  } else {
    console.log('\n❌ Login failed. Check the error above.');
  }

  process.exit(0);
}

test().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});