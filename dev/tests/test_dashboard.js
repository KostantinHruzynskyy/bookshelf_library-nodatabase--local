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
  console.log('🧪 Testing Dashboard API...\n');

  // Login first to get cookie
  console.log('1. Login to get session...');
  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'admin@bookshelf.com', password: 'admin123' }
  });
  console.log('   Status:', login.status);
  
  if (login.status !== 200) {
    console.log('   ❌ Login failed');
    return;
  }
  
  const cookie = login.headers['set-cookie'][0];
  console.log('   ✓ Got session cookie');
  
  // Test user profile
  console.log('\n2. GET /api/user/profile');
  const profile = await request('/api/user/profile', {
    headers: { 'Cookie': cookie }
  });
  console.log('   Status:', profile.status);
  console.log('   Response:', JSON.stringify(profile.data).substring(0, 100));
  console.log('   Result:', profile.status === 200 ? '✅ OK' : '❌ FAIL');
  
  // Test user books
  console.log('\n3. GET /api/user/books');
  const books = await request('/api/user/books', {
    headers: { 'Cookie': cookie }
  });
  console.log('   Status:', books.status);
  console.log('   Response:', JSON.stringify(books.data).substring(0, 100));
  console.log('   Result:', books.status === 200 ? '✅ OK' : '❌ FAIL');
  
  // Test health
  console.log('\n4. GET /api/health');
  const health = await request('/api/health');
  console.log('   Status:', health.status);
  console.log('   Result:', health.status === 200 ? '✅ OK' : '❌ FAIL');
  
  console.log('\n' + '='.repeat(50));
  console.log('Dashboard API tests complete!');
  
  process.exit(0);
}

test().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});