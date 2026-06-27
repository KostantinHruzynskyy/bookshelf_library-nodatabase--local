'use strict';

const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { validateEmailFormat, isDomainAllowed } = require('./email-validator');
const { sanitizeText } = require('./input-sanitizer');

function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'missing_fields', message: 'Email and password are required.' });
  if (!validateEmailFormat(email).startsWith('ok')) return res.status(400).json({ error: 'invalid_email', message: 'Invalid email.' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'invalid_credentials', message: 'Invalid credentials.' });
  if (user.is_active === 0) return res.status(403).json({ error: 'account_disabled', message: 'Account disabled.' });
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return res.status(423).json({ error: 'account_locked', message: 'Account locked. Retry later.' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    const attempts = (user.failed_login_attempts || 0) + 1;
    if (attempts >= 5) {
      const lockedUntil = new Date(Date.now() + 30*60000).toISOString();
      db.prepare('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?').run(attempts, lockedUntil, user.id);
      return res.status(423).json({ error: 'account_locked', message: 'Too many attempts.' });
    }
    db.prepare('UPDATE users SET failed_login_attempts = ? WHERE id = ?').run(attempts, user.id);
    return res.status(401).json({ error: 'invalid_credentials', message: 'Invalid credentials.' });
  }

  db.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = datetime("now") WHERE id = ?').run(user.id);

  const sessionId = Buffer.from(Date.now().toString() + '.' + Math.random().toString(36).slice(2)).toString('base64').slice(0, 64);
  const expiresAt = new Date(Date.now() + 86400000).toISOString();
  db.prepare(
    `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id INTEGER, ip_address TEXT, user_agent TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP, expires_at DATETIME, is_active INTEGER DEFAULT 1, data TEXT)`
  );
  db.prepare('INSERT OR REPLACE INTO sessions (id, user_id, ip_address, user_agent, expires_at, is_active) VALUES (?, ?, ?, ?, ?, 1)')
    .run(sessionId, user.id, req.ip, req.get('user-agent'), expiresAt);

  res.removeHeader('Set-Cookie');
  res.setHeader('Set-Cookie', `bookshelf_session=${sessionId}; Path=/; HttpOnly; SameSite=strict; Max-Age=86400`);

  const { password_hash: _, ...safe } = user;
  return res.json({ ok: true, user: { ...safe, sessionId } });
}

async function register(req, res) {
  const { username, email, password, preferred_language = 'en' } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'missing_fields', message: 'All fields required.' });
  const fmt = validateEmailFormat(email);
  if (!fmt.startsWith('ok')) return res.status(400).json({ error: 'invalid_email', message: 'Invalid email format.' });

  const check = await isDomainAllowed(email);
  if (!check.allowed) return res.status(400).json({ error: 'domain_not_allowed', message: 'Popular email domains only.' });

  const db = getDb();
  const exists = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(email, username);
  if (exists) return res.status(409).json({ error: 'user_exists', message: 'Username or email taken.' });

  if (password.length < 8) return res.status(400).json({ error: 'weak_password', message: 'Password must be 8+ characters.' });

  const hash = bcrypt.hashSync(password, 12);
  const result = db.prepare('INSERT INTO users (username, email, password_hash, preferred_language) VALUES (?, ?, ?, ?)').run(username, email, hash, preferred_language);
  const userId = result.lastInsertRowid;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  const sessionId = Buffer.from(Date.now().toString() + '.' + Math.random().toString(36).slice(2)).toString('base64').slice(0, 64);
  const expiresAt = new Date(Date.now() + 86400000).toISOString();
  db.prepare('INSERT OR REPLACE INTO sessions (id, user_id, ip_address, user_agent, expires_at, is_active) VALUES (?, ?, ?, ?, ?, 1)')
    .run(sessionId, userId, req.ip, req.get('user-agent'), expiresAt);

  res.removeHeader('Set-Cookie');
  res.setHeader('Set-Cookie', `bookshelf_session=${sessionId}; Path=/; HttpOnly; SameSite=strict; Max-Age=86400`);

  const { password_hash: _, ...safe } = user;
  return res.json({ ok: true, user: { ...safe, sessionId } });
}

function logout(req, res) {
  const sid = req.user?.sessionId;
  if (sid) {
    try {
      const db = getDb();
      db.prepare('UPDATE sessions SET is_active = 0 WHERE id = ?').run(sid);
    } catch (e) { /* noop */ }
  }
  res.removeHeader('Set-Cookie');
  res.setHeader('Set-Cookie', 'bookshelf_session=deleted; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=strict');
  return res.json({ ok: true });
}

function me(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const { password_hash: _, ...safe } = req.user;
  return res.json({ ok: true, user: safe });
}

module.exports = { login, register, logout, me };
