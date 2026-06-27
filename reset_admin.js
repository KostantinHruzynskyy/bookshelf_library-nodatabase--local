'use strict';

const bcrypt = require('bcryptjs');
const path = require('path');

// Require the db module to initialize database
const { getDb } = require('./db');

const db = getDb();

const ADMIN_EMAIL = 'admin@bookshelf.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_USERNAME = 'admin';

console.log('🔐 Resetting admin account...');

// Check if admin exists
const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(ADMIN_EMAIL);

if (existingAdmin) {
  console.log('✓ Admin user found, updating password...');
  
  // Update password hash
  const newHash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
  db.prepare('UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL, is_active = 1 WHERE email = ?')
    .run(newHash, ADMIN_EMAIL);
  
  console.log('✓ Admin password updated successfully!');
} else {
  console.log('✗ Admin user not found, creating new admin...');
  
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
  db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(ADMIN_USERNAME, ADMIN_EMAIL, hash, 'admin');
  
  console.log('✓ Admin user created successfully!');
}

// Verify the admin can login
const admin = db.prepare('SELECT * FROM users WHERE email = ?').get(ADMIN_EMAIL);
const isValid = bcrypt.compareSync(ADMIN_PASSWORD, admin.password_hash);

if (isValid) {
  console.log('');
  console.log('✅ SUCCESS: Admin account is ready!');
  console.log('');
  console.log('📧 Email: ' + ADMIN_EMAIL);
  console.log('🔑 Password: ' + ADMIN_PASSWORD);
  console.log('👤 Username: ' + ADMIN_USERNAME);
  console.log('🎭 Role: ' + admin.role);
  console.log('');
} else {
  console.log('❌ ERROR: Password verification failed!');
}

process.exit(0);