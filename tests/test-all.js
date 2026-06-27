'use strict';
const http = require('http');
const assert = require('assert');
const BASE = 'http://localhost:3000';
let sessionCookie = null;
let testResults = { passed: 0, failed: 0, total: 0, errors: [] };

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
        try { resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers }); }
        catch (e) { resolve({ status: res.statusCode, data, headers: res.headers }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function test(name, fn) {
  testResults.total++;
  return fn().then(() => { testResults.passed++; console.log(`  ✅ ${name}`); })
    .catch(e => { testResults.failed++; testResults.errors.push({ name, error: e.message }); console.log(`  ❌ ${name}: ${e.message}`); });
}

function assertOk(res) { assert(res.status < 400, `Request failed: status ${res.status}`); }
function assertStatus(res, expected) { assert(res.status === expected, `Expected ${expected}, got ${res.status}`); }
function getCookie(res) {
  const sc = res.headers['set-cookie'];
  if (!sc) return null;
  return (Array.isArray(sc) ? sc[0] : sc).split(';')[0];
}

async function testHealth() {
  console.log('\n🏥 Health & Infrastructure');
  await test('Health endpoint', async () => { const r = await request('GET','/api/health'); assertStatus(r,200); assert(r.data.status==='ok'); });
  await test('Security headers', async () => { const r = await request('GET','/'); assert(r.headers['x-frame-options']); assert(r.headers['x-content-type-options']); });
}

async function testAuth() {
  console.log('\n🔐 Authentication');
  await test('Register new user', async () => {
    const r = await request('POST','/api/auth/register',{username:'tu_'+Date.now(),email:`t${Date.now()}@gmail.com`,password:'Test1234!@'});
    assertOk(r); assert(getCookie(r));
  });
  await test('Login admin', async () => {
    const r = await request('POST','/api/auth/login',{email:'admin@bookshelf.com',password:'admin123'});
    assertOk(r); sessionCookie = getCookie(r); assert(sessionCookie);
  });
  await test('Get current user', async () => { const r = await request('GET','/api/auth/me',null,{Cookie:sessionCookie}); assertOk(r); assert(r.data.ok); });
  await test('Invalid login rejected', async () => { const r = await request('POST','/api/auth/login',{email:'w@t.com',password:'w'}); assertStatus(r,401); });
  await test('Unauth access rejected', async () => { const r = await request('GET','/api/auth/me'); assertStatus(r,401); });
}

async function testPasswordReset() {
  console.log('\n🔑 Password Reset');
  await test('Request reset', async () => { const r = await request('POST','/api/auth/request-reset',{email:'admin@bookshelf.com'}); assertOk(r); });
  await test('No email enumeration', async () => { const r = await request('POST','/api/auth/request-reset',{email:'none@test.com'}); assertOk(r); });
  await test('Invalid token rejected', async () => { const r = await request('POST','/api/auth/confirm-reset',{token:'x',password:'Np123!@'}); assertStatus(r,400); });
}

async function testEmailVerification() {
  console.log('\n📧 Email Verification');
  await test('Request verification', async () => { const r = await request('POST','/api/auth/request-verification',null,{Cookie:sessionCookie}); assert(r.status===200||r.status===400); });
  await test('Invalid token rejected', async () => { const r = await request('GET','/api/auth/verify-email?token=inv'); assertStatus(r,400); });
}

async function testProfile() {
  console.log('\n👤 Profile');
  await test('Get profile', async () => { const r = await request('GET','/api/user/profile',null,{Cookie:sessionCookie}); assertOk(r); });
  await test('Update profile', async () => { const r = await request('PUT','/api/user/profile',{username:'admin',preferred_language:'en'},{Cookie:sessionCookie}); assertOk(r); });
  await test('Wrong password change rejected', async () => { const r = await request('POST','/api/user/change-password',{currentPassword:'w',newPassword:'Np123!@'},{Cookie:sessionCookie}); assertStatus(r,400); });
}

async function testRatings() {
  console.log('\n⭐ Ratings');
  await test('Get book ratings', async () => { const r = await request('GET','/api/books/99999/ratings'); assertOk(r); });
  await test('Unauth rating rejected', async () => { const r = await request('POST','/api/books/1/ratings',{rating:5}); assertStatus(r,401); });
  await test('Invalid rating rejected', async () => { const r = await request('POST','/api/books/1/ratings',{rating:10},{Cookie:sessionCookie}); assertStatus(r,400); });
}

async function testSearch() {
  console.log('\n🔍 Search');
  await test('Empty search', async () => { const r = await request('GET','/api/search'); assertOk(r); });
  await test('Search with query', async () => { const r = await request('GET','/api/search?q=gatsby'); assertOk(r); });
  await test('Search with pagination', async () => { const r = await request('GET','/api/search?page=1&limit=5'); assertOk(r); assert(r.data.pagination); });
}

async function testAdmin() {
  console.log('\n⚙️ Admin');
  await test('List users', async () => { const r = await request('GET','/api/admin/users',null,{Cookie:sessionCookie}); assertOk(r); assert(Array.isArray(r.data.users)); });
  await test('System stats', async () => { const r = await request('GET','/api/admin/stats',null,{Cookie:sessionCookie}); assertOk(r); assert(r.data.stats); });
  await test('List books', async () => { const r = await request('GET','/api/admin/books',null,{Cookie:sessionCookie}); assertOk(r); });
  await test('Unauth admin rejected', async () => { const r = await request('GET','/api/admin/users'); assertStatus(r,401); });
  await test('Invalid role rejected', async () => { const r = await request('PUT','/api/admin/users/1',{role:'superadmin'},{Cookie:sessionCookie}); assertStatus(r,400); });
}

async function run() {
  console.log('🧪 Bookshelf Library - Comprehensive Test Suite');
  console.log('='.repeat(50));
  const start = Date.now();
  const suites = [testHealth, testAuth, testPasswordReset, testEmailVerification, testProfile, testRatings, testSearch, testAdmin];
  for (const s of suites) { try { await s(); } catch (e) { console.log('  ⚠️ Suite failed:', e.message); } }
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Results: ${testResults.passed}/${testResults.total} passed, ${testResults.failed} failed`);
  console.log(`⏱️  Time: ${elapsed}s`);
  if (testResults.failed > 0) { console.log('\n❌ Failed:'); testResults.errors.forEach(e => console.log(`   - ${e.name}: ${e.error}`)); }
  process.exit(testResults.failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Runner error:', e.message); process.exit(1); });
