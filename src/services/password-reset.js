'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getDb } = require('../database/connection');
const { sanitizeText } = require('../middleware/input-sanitizer');
const { validatePasswordStrength } = require('../middleware/csrf-protection');

const TOKEN_EXPIRY_HOURS = 1;
const MAX_RESET_ATTEMPTS = 5;

function ensureResetTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      used_at DATETIME
    )
  `);
}

function createResetToken(email, ipAddress) {
  const db = getDb();
  ensureResetTable(db);

  const cleanEmail = sanitizeText(email.toLowerCase().trim(), 255);
  const user = db.prepare('SELECT id, email, is_active FROM users WHERE email = ?').get(cleanEmail);

  // Always return success to prevent email enumeration
  if (!user || user.is_active === 0) {
    return { ok: true, message: 'If an account exists with this email, a reset link has been sent.' };
  }

  // Limit reset attempts per user (check recent tokens)
  const recentTokens = db.prepare(
    'SELECT COUNT(*) as count FROM password_reset_tokens WHERE user_id = ? AND created_at > datetime(\'now\', \'-1 hour\') AND used_at IS NULL'
  ).get(user.id);
  if (recentTokens.count >= MAX_RESET_ATTEMPTS) {
    return { ok: true, message: 'If an account exists with this email, a reset link has been sent.' };
  }

  // Invalidate existing tokens
  db.prepare('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL').run(user.id);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 3600000).toISOString();

  db.prepare('INSERT INTO password_reset_tokens (user_id, token, ip_address, expires_at) VALUES (?, ?, ?, ?)').run(user.id, token, ipAddress || null, expiresAt);

  return {
    ok: true,
    message: 'If an account exists with this email, a reset link has been sent.',
    // For dev/testing only — in production send via email
    _dev_token: token,
    _dev_userId: user.id
  };
}

function resetPassword(token, newPassword) {
  const db = getDb();
  ensureResetTable(db);

  const cleanToken = sanitizeText(token, 128);
  if (!cleanToken) return { ok: false, error: 'missing_token', message: 'Reset token is required.' };

  // Validate password strength
  const strengthCheck = validatePasswordStrength(newPassword);
  if (!strengthCheck.isValid) {
    return { ok: false, error: 'weak_password', message: 'Password does not meet requirements.', errors: strengthCheck.errors };
  }

  const record = db.prepare('SELECT * FROM password_reset_tokens WHERE token = ? AND used_at IS NULL').get(cleanToken);
  if (!record) {
    return { ok: false, error: 'invalid_token', message: 'Invalid or expired reset token.' };
  }

  if (new Date(record.expires_at) < new Date()) {
    db.prepare('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(record.id);
    return { ok: false, error: 'token_expired', message: 'Reset token has expired. Please request a new one.' };
  }

  const hash = bcrypt.hashSync(newPassword, 12);

  const tx = db.transaction(() => {
    db.prepare('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(record.id);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP, failed_login_attempts = 0, locked_until = NULL WHERE id = ?').run(hash, record.user_id);
    // Invalidate all sessions for this user
    db.prepare('UPDATE sessions SET is_active = 0 WHERE user_id = ?').run(record.user_id);
  });
  tx();

  return { ok: true, message: 'Password has been reset successfully. Please log in with your new password.' };
}

// Route handlers
function requestReset(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'missing_email', message: 'Email is required.' });

  try {
    const result = createResetToken(email, req.ip);
    return res.json(result);
  } catch (e) {
    console.error('[PASSWORD_RESET] Error:', e.message);
    return res.status(500).json({ error: 'reset_failed', message: 'An error occurred. Please try again.' });
  }
}

function confirmPasswordReset(req, res) {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'missing_fields', message: 'Token and new password are required.' });

  try {
    const result = resetPassword(token, password);
    if (!result.ok) return res.status(400).json(result);
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: 'reset_failed', message: 'An error occurred. Please try again.' });
  }
}

function validateResetToken(req, res) {
  const token = sanitizeText(req.query.token || '', 128);
  if (!token) return res.status(400).json({ error: 'missing_token', message: 'Token is required.' });

  const db = getDb();
  ensureResetTable(db);
  const record = db.prepare('SELECT * FROM password_reset_tokens WHERE token = ? AND used_at IS NULL').get(token);
  if (!record || new Date(record.expires_at) < new Date()) {
    return res.status(400).json({ ok: false, valid: false, error: 'invalid_token', message: 'Invalid or expired reset token.' });
  }
  return res.json({ ok: true, valid: true });
}

module.exports = {
  createResetToken,
  resetPassword,
  requestReset,
  confirmPasswordReset,
  validateResetToken,
  ensureResetTable
};
