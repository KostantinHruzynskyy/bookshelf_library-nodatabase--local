'use strict';

function createAuditLogger(getDb) {
  return {
    logEvent(eventType, severity, description, userId, sessionId, ip, userAgent, metadata = {}) {
      try {
        const db = getDb();
        db.prepare(
          `INSERT INTO security_audit_log (event_type, severity, user_id, session_id, ip_address, user_agent, description, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(eventType, severity, userId || null, sessionId || null, ip || null, userAgent || null, description, JSON.stringify(metadata));
      } catch (e) { /* never throw on audit failure */ }
    },
    logEventSource(eventSource, severity, ip, endpoint, details, blocked = false) {
      try {
        const db = getDb();
        db.prepare(
          `INSERT INTO security_events (event_source, severity, ip_address, endpoint, details, blocked)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(eventSource, severity, ip || null, endpoint || null, details || '', blocked ? 1 : 0);
      } catch (e) { /* noop */ }
    },
    logLoginAttempt(identifier, idType, success, ip, userAgent, attemptType = 'login') {
      try {
        const db = getDb();
        db.prepare(
          `INSERT INTO login_attempts (identifier, identifier_type, attempt_type, success, ip_address, user_agent)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(identifier, idType, attemptType, success ? 1 : 0, ip || null, userAgent || null);
      } catch (e) { /* noop */ }
    },
    logFileScan(bookId, scanType, result, details) {
      try {
        const db = getDb();
        db.prepare(
          `INSERT INTO file_scan_results (book_id, scan_type, result, details) VALUES (?, ?, ?, ?)`
        ).run(bookId || null, scanType || 'mime_validation', result, details || '');
      } catch (e) { /* noop */ }
    },
  };
}

module.exports = { createAuditLogger };

