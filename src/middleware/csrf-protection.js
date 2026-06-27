'use strict';
const crypto = require('crypto');
const { getDb } = require('../database/connection');

const tokenStore = new Map();
const TOKEN_MAX_AGE = 3600000;

function generateCsrfToken(sessionId) {
  const token = crypto.randomBytes(32).toString('hex');
  tokenStore.set(token, { sessionId, createdAt: Date.now() });
  if (tokenStore.size > 10000) cleanExpiredTokens();
  return token;
}

function validateCsrfToken(token, sessionId) {
  if (!token) return false;
  const stored = tokenStore.get(token);
  if (!stored || stored.sessionId !== sessionId) return false;
  if (Date.now() - stored.createdAt > TOKEN_MAX_AGE) {
    tokenStore.delete(token);
    return false;
  }
  return true;
}

function cleanExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (now - data.createdAt > TOKEN_MAX_AGE) tokenStore.delete(token);
  }
}

function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.path.startsWith('/api/') && req.headers['x-api-key']) return next();
  
  const sessionId = req.user?.sessionId || req.cookies?.bookshelf_session;
  const token = req.headers['x-csrf-token'] || req.body?._csrf || req.query?._csrf;
  
  if (!validateCsrfToken(token, sessionId)) {
    return res.status(403).json({
      error: 'csrf_invalid',
      message: 'Invalid or expired CSRF token.'
    });
  }
  next();
}

function attachCsrfToken(req, res, next) {
  const sessionId = req.user?.sessionId || req.cookies?.bookshelf_session;
  if (sessionId) {
    const token = generateCsrfToken(sessionId);
    res.locals.csrfToken = token;
    req.csrfToken = token;
    res.setHeader('X-CSRF-Token', token);
  }
  next();
}

function rateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const max = options.max || 100;
  const message = options.message || 'Too many requests.';
  const store = new Map();
  
  return (req, res, next) => {
    const key = req.ip + ':' + (req.path || req.url);
    const now = Date.now();
    
    if (!store.has(key)) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const record = store.get(key);
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }
    
    record.count++;
    if (record.count > max) {
      return res.status(429).json({
        error: 'rate_limited',
        message,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }
    next();
  };
}

function securityHeaders(req, res, next) {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.removeHeader('X-Powered-By');
  next();
}

function validate(schema) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body?.[field] || req.query?.[field] || req.params?.[field];
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }
      if (value && rules.type === 'email') {
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)) {
          errors.push({ field, message: `${field} must be a valid email` });
        }
      }
      if (value && rules.minLength && value.length < rules.minLength) {
        errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
      }
      if (value && rules.maxLength && value.length > rules.maxLength) {
        errors.push({ field, message: `${field} must be at most ${rules.maxLength} characters` });
      }
    }
    if (errors.length > 0) {
      return res.status(400).json({ error: 'validation_failed', message: 'Validation failed', errors });
    }
    next();
  };
}

function validatePasswordStrength(password) {
  const errors = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Must contain uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Must contain lowercase letter');
  if (!/\\d/.test(password)) errors.push('Must contain number');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Must contain special character');
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\\d/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  
  return {
    isValid: errors.length === 0,
    errors,
    strength: score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong'
  };
}

function auditLog(action, userId, details = {}) {
  const db = getDb();
  try {
    db.prepare(`INSERT INTO security_audit_log (event_type, severity, user_id, ip_address, user_agent, description, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(action, 'info', userId || null, details.ip || null, details.userAgent || null, action, JSON.stringify(details));
  } catch (e) {
    console.error('[AUDIT] Failed to log:', e.message);
  }
}

module.exports = {
  csrfProtection,
  attachCsrfToken,
  rateLimiter,
  securityHeaders,
  validate,
  validatePasswordStrength,
  auditLog,
  generateCsrfToken,
  validateCsrfToken
};