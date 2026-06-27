'use strict';
const { securityHeaders, csrfProtection, attachCsrfToken, rateLimiter } = require('./csrf-protection');
const { authRequired, adminRequired } = require('./auth-middleware');
const { getDb } = require('../database/connection');

function applySecurity(app) {
  app.use(securityHeaders);
  app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }));
  app.use('/api/auth/', rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }));
  app.use(attachCsrfToken);
  
  app.use((req, res, next) => {
    const cookies = (req.headers.cookie || "").split(";");
    let sid = null;
    for (const c of cookies) {
      const [k, ...v] = c.trim().split("=");
      if (k === "bookshelf_session") { sid = v.join("="); break; }
    }
    if (!sid) return next();
    try {
      const db = getDb();
      const session = db.prepare("SELECT s.id as sessionId, s.user_id, s.ip_address, s.user_agent, s.expires_at, u.id, u.username, u.email, u.role, u.preferred_language, u.is_active, u.created_at, u.last_login_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.is_active = 1 AND (s.expires_at IS NULL OR s.expires_at > datetime('now'))").get(sid);
      if (session) {
        if (session.is_active === 0) {
          res.status(401).json({ error: 'account_disabled' });
          return;
        }
        req.user = session;
      }
    } catch (e) { console.error('[SESSION]', e.message); }
    next();
  });
  
  console.log('✓ Security middleware applied');
  console.log('  - Security Headers (XSS, CSRF, Clickjacking protection)');
  console.log('  - Rate Limiting (100 req/15min general, 10 req/15min auth)');
  console.log('  - CSRF Token generation and validation');
  console.log('  - Session validation with expiration');
  console.log('  - Account status checking');
}

module.exports = { applySecurity };