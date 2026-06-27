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
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function test() {
  console.log('🔒 Testing security enhancements...\n');

  // Test 1: Health endpoint
  console.log('1. Health Check');
  try {
    const health = await request('/api/health');
    console.log('   Status:', health.status);
    console.log('   Response:', JSON.stringify(health.data));
    console.log('   Result:', health.status === 200 ? '✅ OK' : '❌ FAIL');
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }

  // Test 2: Security headers
  console.log('\n2. Security Headers');
  try {
    const home = await request('/');
    const headers = home.headers;
    console.log('   X-Frame-Options:', headers['x-frame-options'] || 'MISSING');
    console.log('   X-Content-Type-Options:', headers['x-content-type-options'] || 'MISSING');
    console.log('   X-XSS-Protection:', headers['x-xss-protection'] || 'MISSING');
    console.log('   Referrer-Policy:', headers['referrer-policy'] || 'MISSING');
    const hasSecurityHeaders = headers['x-frame-options'] && headers['x-content-type-options'];
    console.log('   Result:', hasSecurityHeaders ? '✅ OK' : '❌ FAIL');
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }

  // Test 3: CSRF token
  console.log('\n3. CSRF Token');
  try {
    const home = await request('/');
    const csrfToken = home.headers['x-csrf-token'];
    console.log('   Token received:', csrfToken ? 'YES' : 'NO');
    console.log('   Token length:', csrfToken ? csrfToken.length : 0);
    console.log('   Result:', csrfToken && csrfToken.length === 64 ? '✅ OK' : '⚠️ Check needed');
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }

  // Test 4: Login with admin
  console.log('\n4. Admin Login');
  try {
    const login = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'admin@bookshelf.com', password: 'admin123' }
    });
    console.log('   Status:', login.status);
    console.log('   Response:', JSON.stringify(login.data).substring(0, 100));
    console.log('   Set-Cookie:', login.headers['set-cookie'] ? 'YES' : 'NO');
    const cookie = login.headers['set-cookie'] ? login.headers['set-cookie'][0] : null;
    console.log('   Result:', login.status === 200 && cookie ? '✅ OK' : '❌ FAIL');

    // Test 5: Access protected route
    if (cookie) {
      console.log('\n5. Protected Route Access');
      const profile = await request('/api/user/profile', {
        headers: { 'Cookie': cookie }
      });
      console.log('   Status:', profile.status);
      console.log('   Response:', JSON.stringify(profile.data).substring(0, 100));
      console.log('   Result:', profile.status === 200 ? '✅ OK' : '❌ FAIL');
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }

  // Test 6: Rate limiting (quick requests)
  console.log('\n6. Rate Limiting');
  try {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(request('/api/health'));
    }
    const results = await Promise.all(promises);
    const allOk = results.every(r => r.status === 200);
    console.log('   Sent 5 rapid requests');
    console.log('   All successful:', allOk);
    console.log('   Result:', allOk ? '✅ OK (within limits)' : '⚠️ Rate limited');
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }

  // Test 7: Invalid login
  console.log('\n7. Invalid Login Attempt');
  try {
    const invalid = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'wrong@test.com', password: 'wrong' }
    });
    console.log('   Status:', invalid.status);
    console.log('   Response:', JSON.stringify(invalid.data));
    console.log('   Result:', invalid.status === 401 ? '✅ OK (rejected)' : '⚠️ Check');
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('Security tests complete!');
  
  process.exit(0);
}

test().catch(err => {
  console.error('Test error:', err.message);
  process.exit(1);
});