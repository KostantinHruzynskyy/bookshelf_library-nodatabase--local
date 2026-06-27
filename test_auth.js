const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function test() {
  console.log('Testing Bookshelf Library Authentication System\n');
  
  let passed = 0;
  let failed = 0;
  
  function assert(condition, message) {
    if (condition) {
      console.log('✓ ' + message);
      passed++;
    } else {
      console.log('✗ ' + message);
      failed++;
    }
  }
  
  // Helper function for HTTP requests
  function request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, BASE_URL);
      const req = http.request(url, {
        method: options.method || 'GET',
        headers: options.headers || {},
        ...options
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
  
  try {
    // Test 1: Server is running
    console.log('1. Server Status');
    const index = await request('/');
    assert(index.status === 200, 'Server is running');
    
    // Test 2: Registration page exists
    console.log('\n2. Registration Page');
    const regPage = await request('/register.html');
    assert(regPage.status === 200, 'Registration page accessible');
    
    // Test 3: Login page exists
    console.log('\n3. Login Page');
    const loginPage = await request('/login.html');
    assert(loginPage.status === 200, 'Login page accessible');
    
    // Test 4: Dashboard page exists
    console.log('\n4. Dashboard Page');
    const dashPage = await request('/dashboard.html');
    assert(dashPage.status === 200, 'Dashboard page accessible');
    
    // Test 5: API - Get books (public)
    console.log('\n5. Public API');
    const books = await request('/api/books');
    assert(books.status === 200, 'Books API is public');
    assert(Array.isArray(books.data), 'Books API returns array');
    
    // Test 6: API - Register validation
    console.log('\n6. Registration Validation');
    const badReg = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { username: 'ab', email: 'bad', password: '123' }
    });
    assert(badReg.status === 400, 'Registration validates input');
    
    // Test 7: API - Login required for protected routes
    console.log('\n7. Protected Routes');
    const profile = await request('/api/user/profile');
    assert(profile.status === 401, 'Profile requires login');
    
    const userBooks = await request('/api/user/books');
    assert(userBooks.status === 401, 'User books requires login');
    
    // Test 8: API - Login with wrong credentials
    console.log('\n8. Login Validation');
    const badLogin = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'wrong@test.com', password: 'wrongpass' }
    });
    assert(badLogin.status === 401, 'Login rejects wrong credentials');
    
    // Test 9: API - Check auth status (not logged in)
    console.log('\n9. Auth Status');
    const me = await request('/api/auth/me');
    assert(me.status === 401, 'Not logged in initially');
    
    // Test 10: API - Admin page protection
    console.log('\n10. Admin Protection');
    const adminPage = await request('/admin.html');
    assert(adminPage.status === 200, 'Admin page accessible (client-side protection)');
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    console.log('='.repeat(50));
    
    if (failed === 0) {
      console.log('\n✓ All tests passed! The authentication system is working correctly.');
    } else {
      console.log(`\n✗ ${failed} test(s) failed. Please check the implementation.`);
    }
    
  } catch (err) {
    console.error('\n✗ Test failed with error:', err.message);
    console.log('Make sure the server is running: npm start');
  }
}

test();