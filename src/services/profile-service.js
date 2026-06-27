'use strict';

const bcrypt = require('bcryptjs');
const { getDb } = require('../database/connection');
const { sanitizeText } = require('../middleware/input-sanitizer');
const { validateEmailFormat } = require('../validators/email-validator');
const { validatePasswordStrength } = require('../middleware/csrf-protection');

function updateProfile(userId, updates) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return { ok: false, error: 'user_not_found' };

  const allowedFields = ['username', 'preferred_language'];
  const setClauses = [];
  const values = [];

  if (updates.username) {
    const clean = sanitizeText(updates.username, 30);
    if (clean.length < 3) return { ok: false, error: 'invalid_username', message: 'Username must be at least 3 characters.' };
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(clean, userId);
    if (existing) return { ok: false, error: 'username_taken', message: 'Username is already taken.' };
    setClauses.push('username = ?');
    values.push(clean);
  }

  if (updates.preferred_language) {
    const lang = sanitizeText(updates.preferred_language, 5);
    setClauses.push('preferred_language = ?');
    values.push(lang);
  }

  if (setClauses.length === 0) return { ok: false, error: 'no_updates', message: 'No valid fields to update.' };

  setClauses.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);

  db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT id, username, email, role, preferred_language, is_email_verified, created_at, last_login_at FROM users WHERE id = ?').get(userId);
  return { ok: true, user: updated, message: 'Profile updated successfully.' };
}

function changePassword(userId, currentPassword, newPassword) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return { ok: false, error: 'user_not_found' };

  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return { ok: false, error: 'wrong_password', message: 'Current password is incorrect.' };
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.isValid) {
    return { ok: false, error: 'weak_password', message: 'New password does not meet requirements.', errors: strength.errors };
  }

  const hash = bcrypt.hashSync(newPassword, 12);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, userId);

  return { ok: true, message: 'Password changed successfully.' };
}

function changeEmail(userId, newEmail, password) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return { ok: false, error: 'user_not_found' };

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return { ok: false, error: 'wrong_password', message: 'Password is incorrect.' };
  }

  const cleanEmail = sanitizeText(newEmail.toLowerCase().trim(), 255);
  const emailCheck = validateEmailFormat(cleanEmail);
  if (!emailCheck.startsWith('ok')) {
    return { ok: false, error: 'invalid_email', message: 'Please enter a valid email address.' };
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(cleanEmail, userId);
  if (existing) return { ok: false, error: 'email_taken', message: 'Email is already in use.' };

  db.prepare('UPDATE users SET email = ?, is_email_verified = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(cleanEmail, userId);

  return { ok: true, message: 'Email changed. Please verify your new email address.', email: cleanEmail };
}

// Route handlers
function updateProfileRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  try {
    const result = updateProfile(req.user.id, req.body);
    if (!result.ok) return res.status(400).json(result);
    return res.json(result);
  } catch (e) { return res.status(500).json({ error: 'update_failed', message: e.message }); }
}

function changePasswordRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'missing_fields', message: 'Current and new password are required.' });
  try {
    const result = changePassword(req.user.id, currentPassword, newPassword);
    if (!result.ok) return res.status(400).json(result);
    return res.json(result);
  } catch (e) { return res.status(500).json({ error: 'change_failed', message: e.message }); }
}

function changeEmailRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'missing_fields', message: 'Email and password are required.' });
  try {
    const result = changeEmail(req.user.id, email, password);
    if (!result.ok) return res.status(400).json(result);
    return res.json(result);
  } catch (e) { return res.status(500).json({ error: 'change_failed', message: e.message }); }
}

module.exports = {
  updateProfile, changePassword, changeEmail,
  updateProfileRoute, changePasswordRoute, changeEmailRoute
};
