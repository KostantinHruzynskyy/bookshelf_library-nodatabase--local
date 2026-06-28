'use strict';

const { getDb } = require('../database/connection');

function ensureTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('info','success','warning','error','rating','review','system')),
      title TEXT NOT NULL,
      message TEXT DEFAULT '',
      link TEXT DEFAULT '',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
  `);
}

function createNotification(userId, type, title, message, link) {
  const db = getDb();
  ensureTable(db);
  const result = db.prepare(
    'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, type, title, message || '', link || '');
  return { ok: true, id: result.lastInsertRowid };
}

function getNotifications(userId, page, limit, unreadOnly) {
  page = page || 1; limit = Math.min(limit || 20, 50);
  const db = getDb();
  ensureTable(db);
  const offset = (page - 1) * limit;
  const where = unreadOnly ? 'WHERE user_id = ? AND is_read = 0' : 'WHERE user_id = ?';
  const notifications = db.prepare(
    `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(userId, limit, offset);
  const total = db.prepare(
    `SELECT COUNT(*) as c FROM notifications ${where}`
  ).get(userId).c;
  const unreadCount = db.prepare(
    'SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0'
  ).get(userId).c;
  return {
    notifications,
    unreadCount,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
}

function markAsRead(notificationId, userId) {
  const db = getDb();
  ensureTable(db);
  const result = db.prepare(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
  ).run(notificationId, userId);
  return { ok: result.changes > 0, message: result.changes > 0 ? 'Marked as read' : 'Not found' };
}

function markAllAsRead(userId) {
  const db = getDb();
  ensureTable(db);
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(userId);
  return { ok: true, message: 'All notifications marked as read' };
}

function deleteNotification(notificationId, userId) {
  const db = getDb();
  ensureTable(db);
  const result = db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(notificationId, userId);
  return { ok: result.changes > 0, message: result.changes > 0 ? 'Deleted' : 'Not found' };
}

function clearAll(userId) {
  const db = getDb();
  ensureTable(db);
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
  return { ok: true, message: 'All notifications cleared' };
}

// Route handlers
function createRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const { type, title, message, link } = req.body;
  if (!type || !title) return res.status(400).json({ error: 'missing_fields', message: 'Type and title required.' });
  try {
    const result = createNotification(req.user.id, type, title, message, link);
    return res.json({ ok: true, ...result });
  } catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function listRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const unreadOnly = req.query.unread === 'true';
    return res.json({ ok: true, ...getNotifications(req.user.id, page, limit, unreadOnly) });
  } catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function markReadRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  try {
    const result = markAsRead(parseInt(req.params.id), req.user.id);
    return res.json(result);
  } catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function markAllReadRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  try {
    return res.json(markAllAsRead(req.user.id));
  } catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function deleteRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  try {
    return res.json(deleteNotification(parseInt(req.params.id), req.user.id));
  } catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function clearRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  try {
    return res.json(clearAll(req.user.id));
  } catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

module.exports = {
  createNotification, getNotifications, markAsRead, markAllAsRead, deleteNotification, clearAll,
  createRoute, listRoute, markReadRoute, markAllReadRoute, deleteRoute, clearRoute, ensureTable
};
