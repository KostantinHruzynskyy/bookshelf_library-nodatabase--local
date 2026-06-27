'use strict';

const bcrypt = require('bcryptjs');
const { getDbEnhanced } = require('../db-enhanced');
const { validateEmailFormat, isDomainAllowed } = require('./email-validator');

function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'missing_fields', message: 'Email and password are required.' });

  const emailCheck = validateEmailFormat(email);
  if (emailCheck !== 'ok') return res.status(400).json({ error: 'invalid_email', message: 'Invalid email format.' });

  const db = getDbEnhanced();
  const user = db.getUserByEmail(email);
  if (!user) {
    req._auditLog?.logLoginAttempt?.(email, 'email', false, req.ip, req.get('user-agent'), 'login');
    return res.status(401).json({ error: 'invalid_credentials', message: 'Invalid email or password.' });
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return res.status(423).json({ error: 'account_locked', message: 'Account temporarily locked. Try later.' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    db.incrementFailedLogin(user.id);
    const attempts = (user.failed_login_attempts || 0) + 1;
    if (attempts >= 5) db.lockUserAccount(user.id, 30);
    req._auditLog?.logLoginAttempt?.(email, 'email', false, req.ip, req.get('user-agent'), 'login');
    req._auditLog?.logEvent?.('login_failed', 'warning', `Failed login for ${email}`, user.id, null, req.ip, req.get('user-agent'), { attempts });
    return res.status(401).json({ error: 'invalid_credentials', message: 'Invalid email or password.' });
  }

  if (user.is_active !== 1) {
    return res.status(403).json({ error: 'account_disabled', message: 'Account is disabled.' });
  }

  db.resetFailedLogin(user.id);
  db.updateUserLastLogin(user.id);

  const sessionId = db.createSession(user.id, req.ip, req.get('user-agent'), 24);
  res.setHeader('Set-Cookie', req._buildSessionCookie(sessionId));

  req._auditLog?.logLoginAttempt?.(email, 'email', true, req.ip, req.get('user-agent'), 'login');
  req._auditLog?.logEvent?.('login_success', 'success', `Login success for ${email}`, user.id, sessionId, req.ip, req.get('user-agent'), {});

  const { password_hash: _, ...safeUser } = user;
  return res.json({ ok: true, user: { ...safeUser, sessionId } });
}

async function register(req, res) {
  const { username, email, password, preferred_language = 'en' } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'missing_fields', message: 'Username, email and password are required.' });

  const emailCheck = validateEmailFormat(email);
  if (emailCheck !== 'ok') return res.status(400).json({ error: 'invalid_email', message: 'Invalid email format.' });

  const domainCheck = await isDomainAllowed(email);
  if (!domainCheck.allowed) {
    req._auditLog?.logEvent?.('registration_denied', 'warning',
      `Registration denied for domain: ${domainCheck.domain}`, null, null, req.ip, req.get('user-agent'),
      { reason: domainCheck.reason, suggestion: domainCheck.suggestion });
    return res.status(400).json({ error: 'domain_not_allowed', message: 'Registration is only allowed for popular email domains.' });
  }

  const db = getDbEnhanced();
  const existing = db.getUserByEmail(email) || db.getUserByUsername(username);
  if (existing) {
    return res.status(409).json({ error: 'user_exists', message: 'Username or email already registered.' });
  }

  if (password.length < 8) return res.status(400).json({ error: 'weak_password', message: 'Password must be at least 8 characters.' });

  const hash = bcrypt.hashSync(password, 12);
  const userId = db.createUser(username, email, hash);
  const sessionId = db.createSession(userId, req.ip, req.get('user-agent'), 24);
  res.setHeader('Set-Cookie', req._buildSessionCookie(sessionId));

  const user = db.getUserById(userId);
  req._auditLog?.logEvent?.('registration_success', 'success', `New user registered: ${email}`, userId, sessionId, req.ip, req.get('user-agent'), { username });
  return res.json({ ok: true, user: { id: user.id, username: user.username, email: user.email, role: user.role, preferred_language: user.preferred_language, sessionId } });
}

function logout(req, res) {
  const sessionId = req.user?.sessionId;
  if (sessionId) {
    getDbEnhanced().destroySession(sessionId);
    req._auditLog?.logEvent?.('logout', 'info', `User ${req.user?.username} logged out`, req.user?.id, sessionId, req.ip, req.get('user-agent'), {});
  }
  res.removeHeader('Set-Cookie');
  res.setHeader('Set-Cookie', req._buildExpiredCookie());
  return res.json({ ok: true });
}

function me(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const { password_hash: _, ...safeUser } = req.user;
  return res.json({ ok: true, user: safeUser });
}

module.exports = { login, register, logout, me };
