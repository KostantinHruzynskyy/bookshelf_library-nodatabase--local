'use strict';

const { getDb } = require('./db');

const db = getDb();

console.log('🧹 Clearing all sessions...');

try {
  // Check if sessions table exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'
  `).get();

  if (tableExists) {
    // Clear all sessions
    const result = db.prepare('DELETE FROM sessions').run();
    console.log(`✓ Cleared ${result.changes} sessions`);
  } else {
    console.log('✓ No sessions table found (will be created on next login)');
  }

  // Reset failed login attempts for all users
  db.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL').run();
  console.log('✓ Reset failed login attempts for all users');

  console.log('');
  console.log('✅ All sessions cleared. You can now login fresh.');
} catch (error) {
  console.error('❌ Error:', error.message);
}

process.exit(0);