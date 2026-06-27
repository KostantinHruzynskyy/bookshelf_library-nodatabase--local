'use strict';
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDb } = require('../database/connection');
const { validatePasswordStrength } = require('./csrf-protection');

const SESSION_MAX_AGE = 86400000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 1800000;
const BCRYPT_ROUNDS = 12;

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

function ensureSessionsTable(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ip_address TEXT, user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME, is_active INTEGER DEFAULT 1, data TEXT
  )`);
}

function hashPassword(password) {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function authRequired(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'authentication_required', message: 'You must be logged in.' });
  next();
}

function adminRequired(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'authentication_required', message: 'You must be logged in.' });
  if (!['admin', 'moderator'].includes(req.user.role)) return res.status(403).json({ error: 'forbidden', message: 'Admin access required.' });
  next();
}

function moderatorRequired(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'authentication_required', message: 'You must be logged in.' });
  if (!['admin', 'moderator'].includes(req.user.role)) return res.status(403).json({ error: 'forbidden', message: 'Moderator access required.' });
  next();
}

module.exports = {
  authRequired, adminRequired, moderatorRequired,
  hashPassword, verifyPassword, generateSessionId, ensureSessionsTable,
  SESSION_MAX_AGE, MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION, BCRYPT_ROUNDS
};