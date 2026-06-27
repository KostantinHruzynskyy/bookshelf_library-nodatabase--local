'use strict';

const bcrypt = require('bcryptjs');
const { getDb } = require('../database/connection');
const { sanitizeText } = require('../middleware/input-sanitizer');

function listUsers(page, limit) {
  page = page || 1; limit = limit || 20;
  const db = getDb();
  const offset = (page - 1) * limit;
  const users = db.prepare(
    `SELECT id, username, email, role, is_active, is_email_verified,
            preferred_language, created_at, last_login_at, failed_login_attempts
     FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  return { users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

function updateUser(userId, updates) {
  const db = getDb();
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId);
  if (!user) return { ok: false, error: 'not_found', message: 'User not found.' };
  const setClauses = [];
  const values = [];
  if (updates.role !== undefined) {
    if (!['user','moderator','admin'].includes(updates.role)) return { ok: false, error: 'invalid_role' };
    setClauses.push('role = ?'); values.push(updates.role);
  }
  if (updates.is_active !== undefined) {
    setClauses.push('is_active = ?'); values.push(updates.is_active ? 1 : 0);
  }
  if (setClauses.length === 0) return { ok: false, error: 'no_updates' };
  setClauses.push('updated_at = CURRENT_TIMESTAMP'); values.push(userId);
  db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
  return { ok: true, message: 'User updated.' };
}

function deleteUser(userId) {
  const db = getDb();
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId);
  if (!user) return { ok: false, error: 'not_found' };
  if (user.role === 'admin') return { ok: false, error: 'cannot_delete_admin' };
  const tx = db.transaction(() => {
    db.prepare('UPDATE sessions SET is_active = 0 WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM book_ratings WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM reading_progress WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });
  tx();
  return { ok: true, message: 'User deleted.' };
}

function getSystemStats() {
  const db = getDb();
  const users = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const activeUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_active = 1').get().c;
  const books = db.prepare('SELECT COUNT(*) as c FROM books WHERE is_active = 1').get().c;
  let ratings = 0;
  try { ratings = db.prepare('SELECT COUNT(*) as c FROM book_ratings').get().c; } catch (e) { /* table may not exist yet */ }
  const sessions = db.prepare("SELECT COUNT(*) as c FROM sessions WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))").get().c;
  const unverified = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_email_verified = 0').get().c;
  return { users, activeUsers, books, ratings, sessions, unverified, verifiedUsers: users - unverified };
}

function listUsersRoute(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    return res.json({ ok: true, ...listUsers(page, limit) });
  } catch (e) { return res.status(500).json({ error: 'fetch_failed', message: e.message }); }
}

function updateUserRoute(req, res) {
  try {
    const userId = parseInt(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });
    const result = updateUser(userId, req.body);
    if (!result.ok) return res.status(400).json(result);
    return res.json(result);
  } catch (e) { return res.status(500).json({ error: 'update_failed', message: e.message }); }
}

function deleteUserRoute(req, res) {
  try {
    const userId = parseInt(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });
    const result = deleteUser(userId);
    if (!result.ok) return res.status(400).json(result);
    return res.json(result);
  } catch (e) { return res.status(500).json({ error: 'delete_failed', message: e.message }); }
}

function statsRoute(req, res) {
  try { return res.json({ ok: true, stats: getSystemStats() }); }
  catch (e) { return res.status(500).json({ error: 'fetch_failed', message: e.message }); }
}

function listAllBooksRoute(req, res) {
  try {
    const db = getDb();
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const books = db.prepare(
      `SELECT b.id, b.title, b.file_format, b.file_size, b.is_active,
              b.downloads, b.views, b.created_at, u.username as uploader
       FROM books b LEFT JOIN users u ON b.uploaded_by = u.id
       ORDER BY b.created_at DESC LIMIT ? OFFSET ?`
    ).all(limit, offset);
    const total = db.prepare('SELECT COUNT(*) as c FROM books').get().c;
    return res.json({ ok: true, books, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { return res.status(500).json({ error: 'fetch_failed', message: e.message }); }
}

function toggleBookActiveRoute(req, res) {
  try {
    const db = getDb();
    const bookId = parseInt(req.params.bookId);
    if (!bookId) return res.status(400).json({ error: 'invalid_book_id' });
    const book = db.prepare('SELECT is_active FROM books WHERE id = ?').get(bookId);
    if (!book) return res.status(404).json({ error: 'not_found' });
    db.prepare('UPDATE books SET is_active = ? WHERE id = ?').run(book.is_active ? 0 : 1, bookId);
    return res.json({ ok: true, message: 'Book status updated.', is_active: !book.is_active });
  } catch (e) { return res.status(500).json({ error: 'update_failed', message: e.message }); }
}

module.exports = {
  listUsers, updateUser, deleteUser, getSystemStats,
  listUsersRoute, updateUserRoute, deleteUserRoute, statsRoute,
  listAllBooksRoute, toggleBookActiveRoute
};

