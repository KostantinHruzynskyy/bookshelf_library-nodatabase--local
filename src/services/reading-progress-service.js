'use strict';
const { getDb } = require('../database/connection');

function ensureTable(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS reading_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE, current_page INTEGER DEFAULT 1, total_pages INTEGER DEFAULT 1, progress_percent INTEGER DEFAULT 0, last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP, is_completed INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, book_id));
    CREATE INDEX IF NOT EXISTS idx_rp_user ON reading_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_rp_book ON reading_progress(book_id);`);
}

function updateProgress(userId, bookId, currentPage, totalPages) {
  const db = getDb(); ensureTable(db);
  const book = db.prepare('SELECT id FROM books WHERE id = ? AND is_active = 1').get(bookId);
  if (!book) return { ok: false, error: 'book_not_found' };
  const tp = totalPages || 1;
  const progress = Math.min(100, Math.round((currentPage / tp) * 100));
  const isCompleted = progress >= 100 ? 1 : 0;
  const existing = db.prepare('SELECT id FROM reading_progress WHERE user_id = ? AND book_id = ?').get(userId, bookId);
  if (existing) {
    db.prepare('UPDATE reading_progress SET current_page = ?, total_pages = ?, progress_percent = ?, is_completed = ?, last_read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(currentPage, tp, progress, isCompleted, existing.id);
    return { ok: true, progress, isCompleted: !!isCompleted };
  }
  db.prepare('INSERT INTO reading_progress (user_id, book_id, current_page, total_pages, progress_percent, is_completed) VALUES (?, ?, ?, ?, ?, ?)').run(userId, bookId, currentPage, tp, progress, isCompleted);
  return { ok: true, progress, isCompleted: !!isCompleted };
}

function getProgress(userId, bookId) {
  const db = getDb(); ensureTable(db);
  return db.prepare('SELECT * FROM reading_progress WHERE user_id = ? AND book_id = ?').get(userId, bookId);
}

function getUserProgress(userId, page, limit) {
  page = page || 1; limit = Math.min(limit || 20, 50);
  const db = getDb(); ensureTable(db);
  const offset = (page - 1) * limit;
  const items = db.prepare(`SELECT rp.*, b.title, b.author, b.color, b.file_format, b.cover_image FROM reading_progress r JOIN books b ON r.book_id = b.id WHERE r.user_id = ? ORDER BY r.last_read_at DESC LIMIT ? OFFSET ?`).all(userId, limit, offset);
  const total = db.prepare('SELECT COUNT(*) as c FROM reading_progress WHERE user_id = ?').get(userId).c;
  const completed = db.prepare('SELECT COUNT(*) as c FROM reading_progress WHERE user_id = ? AND is_completed = 1').get(userId).c;
  const inProgress = db.prepare('SELECT COUNT(*) as c FROM reading_progress WHERE user_id = ? AND is_completed = 0').get(userId).c;
  return { items, stats: { total, completed, inProgress }, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

function deleteProgress(userId, bookId) {
  const db = getDb(); ensureTable(db);
  db.prepare('DELETE FROM reading_progress WHERE user_id = ? AND book_id = ?').run(userId, bookId);
  return { ok: true };
}

function updateRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const bookId = parseInt(req.params.bookId);
  const { currentPage, totalPages } = req.body;
  if (!bookId) return res.status(400).json({ error: 'invalid_book_id' });
  try { const r = updateProgress(req.user.id, bookId, parseInt(currentPage) || 1, parseInt(totalPages) || 1); return r.ok ? res.json(r) : res.status(400).json(r); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function getRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const bookId = parseInt(req.params.bookId);
  if (!bookId) return res.status(400).json({ error: 'invalid_book_id' });
  try { return res.json({ ok: true, progress: getProgress(req.user.id, bookId) }); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function listRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  try { const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 20; return res.json({ ok: true, ...getUserProgress(req.user.id, page, limit) }); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function deleteRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const bookId = parseInt(req.params.bookId);
  if (!bookId) return res.status(400).json({ error: 'invalid_book_id' });
  try { return res.json(deleteProgress(req.user.id, bookId)); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

module.exports = { updateProgress, getProgress, getUserProgress, deleteProgress, updateRoute, getRoute, listRoute, deleteRoute, ensureTable };
