#!/usr/bin/env node
'use strict';

const bcrypt = require('bcryptjs');
const path = require('path');

console.log('🔧 Bookshelf Library - Login Fix Script\n');

// Load database
const { getDb } = require('./db');
const db = getDb();

// Fix admin account
const ADMIN_EMAIL = 'admin@bookshelf.com';
const ADMIN_PASSWORD = 'admin123';

console.log('Step 1: Checking admin user...');
let admin = db.prepare('SELECT * FROM users WHERE email = ?').get(ADMIN_EMAIL);

if (!admin) {
  console.log('  Admin not found, creating...');
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
  db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run('admin', ADMIN_EMAIL, hash, 'admin');
  admin = db.prepare('SELECT * FROM users WHERE email = ?').get(ADMIN_EMAIL);
  console.log('  ✓ Admin created');
} else {
  console.log('  ✓ Admin found');
}

console.log('\nStep 2: Resetting password...');
const newHash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
db.prepare('UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL, is_active = 1 WHERE id = ?')
  .run(newHash, admin.id);
console.log('  ✓ Password reset to: ' + ADMIN_PASSWORD);

console.log('\nStep 3: Verifying password...');
const verify = bcrypt.compareSync(ADMIN_PASSWORD, newHash);
console.log('  ✓ Password verification:', verify ? 'SUCCESS' : 'FAILED');

console.log('\nStep 4: Checking sessions table...');
const tableExists = db.prepare(`
  SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'
`).get();

if (!tableExists) {
  console.log('  Creating sessions table...');
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
  console.log('  ✓ Sessions table created');
} else {
  console.log('  ✓ Sessions table exists');
}

console.log('\nStep 5: Clearing old sessions...');
db.prepare('DELETE FROM sessions').run();
console.log('  ✓ All sessions cleared');

console.log('\n' + '='.repeat(50));
console.log('✅ FIX COMPLETE!');
console.log('='.repeat(50));
console.log('\nYou can now login with:');
console.log('  Email:    ' + ADMIN_EMAIL);
console.log('  Password: ' + ADMIN_PASSWORD);
console.log('\nRestart the server and try logging in.');

process.exit(0);