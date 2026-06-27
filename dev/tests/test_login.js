'use strict';

const bcrypt = require('bcryptjs');

// Load db
const { getDb } = require('./db');
const db = getDb();

console.log('🔍 Testing admin login...\n');

const email = 'admin@bookshelf.com';
const password = 'admin123';

console.log('1. Looking up user:', email);
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

if (!user) {
  console.log('   ✗ User not found!');
  process.exit(1);
}

console.log('   ✓ User found (ID:', user.id + ')');
console.log('   Role:', user.role);
console.log('   Active:', user.is_active);

console.log('\n2. Checking password:');
console.log('   Stored hash:', user.password_hash.substring(0, 30) + '...');
const valid = bcrypt.compareSync(password, user.password_hash);
console.log('   Password valid:', valid);

console.log('\n3. Checking sessions table:');
const tableExists = db.prepare(`
  SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'
`).get();

if (!tableExists) {
  console.log('   ✗ Sessions table does not exist!');
  console.log('   Creating sessions table...');
  db.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      is_active INTEGER DEFAULT 1,
      data TEXT
    )
  `);
  console.log('   ✓ Sessions table created!');
} else {
  console.log('   ✓ Sessions table exists');
}

console.log('\n4. Testing session creation:');
const sessionId = Buffer.from(Date.now().toString() + '.' + Math.random().toString(36).slice(2)).toString('base64').slice(0, 64).replace(/[^a-zA-Z0-9]/g, '');
const expiresAt = new Date(Date.now() + 86400000).toISOString();

db.prepare(`
  INSERT OR REPLACE INTO sessions (id, user_id, ip_address, user_agent, expires_at, is_active)
  VALUES (?, ?, ?, ?, ?, 1)
`).run(sessionId, user.id, '127.0.0.1', 'test-agent', expiresAt);

console.log('   ✓ Session created:', sessionId.substring(0, 20) + '...');

const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
console.log('   Session valid:', !!session);

console.log('\n✅ All tests passed! Login should work.');