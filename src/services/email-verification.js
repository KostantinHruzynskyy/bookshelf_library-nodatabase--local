'use strict';

const crypto = require('crypto');
const { getDb } = require('../database/connection');
const { sanitizeText } = require('../middleware/input-sanitizer');

const TOKEN_EXPIRY_HOURS = 24;

function ensureVerificationTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      used_at DATETIME
    )
  `);
}

function generateVerificationToken(userId) {
  const db = getDb();
  ensureVerificationTable(db);

  // Invalidate any existing tokens
  db.prepare('UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL').run(userId);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 3600000).toISOString();

  db.prepare('INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(userId, token, expiresAt);

  return token;
}

function verifyEmail(token) {
  const db = getDb();
  ensureVerificationTable(db);

  const record = db.prepare('SELECT * FROM email_verification_tokens WHERE token = ? AND used_at IS NULL').get(token);
  if (!record) {
    return { ok: false, error: 'invalid_token', message: 'Invalid or expired verification token.' };
  }

  if (new Date(record.expires_at) < new Date()) {
    db.prepare('UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(record.id);
    return { ok: false, error: 'token_expired', message: 'Verification token has expired. Please request a new one.' };
  }

  // Mark token as used and verify user email
  const tx = db.transaction(() => {
    db.prepare('UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(record.id);
    db.prepare('UPDATE users SET is_email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(record.user_id);
  });
  tx();

  return { ok: true, message: 'Email verified successfully!' };
}

function resendVerification(userId) {
  const db = getDb();
  const user = db.prepare('SELECT id, email, is_email_verified FROM users WHERE id = ?').get(userId);
  if (!user) return { ok: false, error: 'user_not_found' };
  if (user.is_email_verified) return { ok: false, error: 'already_verified', message: 'Email is already verified.' };

  const token = generateVerificationToken(userId);
  return { ok: true, token, email: user.email };
}

function requestVerification(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });

  try {
    const result = resendVerification(req.user.id);
    if (!result.ok) {
      return res.status(400).json({ error: result.error, message: result.message });
    }

    // In production, send email here. For now return the token for testing.
    return res.json({
      ok: true,
      message: 'Verification email sent. Please check your inbox.',
      // Remove verificationUrl in production; only for dev/testing:
      _dev_verificationUrl: `/api/auth/verify-email?token=${result.token}`
    });
  } catch (e) {
    return res.status(500).json({ error: 'verification_failed', message: e.message });
  }
}

function verifyEmailRoute(req, res) {
  const token = sanitizeText(req.query.token || req.body.token || '', 128);
  if (!token) return res.status(400).json({ error: 'missing_token', message: 'Verification token is required.' });

  const result = verifyEmail(token);
  if (!result.ok) return res.status(400).json(result);

  return res.json(result);
}

module.exports = {
  generateVerificationToken,
  verifyEmail,
  resendVerification,
  requestVerification,
  verifyEmailRoute,
  ensureVerificationTable
};
