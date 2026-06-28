'use strict';

const { getDb } = require('../database/connection');

function ensureTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      page INTEGER DEFAULT 1,
      note TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, book_id)
    );
    CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_book ON bookmarks(book_id);
  `);
}

function addBookmark(userId, bookId, page, note) {
  const db = getDb();
  ensureTable(db);
  const book = db.prepare('SELECT id FROM books WHERE id = ? AND is_active = 1').get(bookId);
  if (!book) return { ok: false, error: 'book_not_found', message: 'Book not found.' };
  const existing = db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND book_id = ?').get(userId, bookId);
  if (existing) {
    db.prepare('UPDATE bookmarks SET page = ?, note = ? WHERE id = ?').run(page || 1, note || '', existing.id);
    return { ok: true, message: 'Bookmark updated.', id: existing.id };
  }
  const result = db.prepare('INSERT INTO bookmarks (user_id, book_id, page, note) VALUES (?, ?, ?, ?)').run(userId, bookId, page || 1, note || '');
  return { ok: true, message: 'Bookmark added.', id: result.lastInsertRowid };
}

function removeBookmark(userId, bookId) {
  const db = getDb();
  ensureTable(db);
  const result = db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND book_id = ?').run(userId, bookId);
  if (result.changes === 0) return { ok: false, error: 'not_found', message: 'Bookmark not found.' };
  return { ok: true, message: 'Bookmark removed.' };
}

function getBookmarks(userId, page, limit) {
  page = page || 1; limit = Math.min(limit || 20, 50);
  const db = getDb();
  ensureTable(db);
  const offset = (page - 1) * limit;
  const bookmarks = db.prepare(`
    SELECT b.id, b.page, b.note, b.created_at,
           bk.id as book_id, bk.title, bk.author, bk.color, bk.file_format, bk.cover_image
    FROM bookmarks b
    JOIN books bk ON b.book_id = bk.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset);
  const total = db.prepare('SELECT COUNT(*) as c FROM bookmarks WHERE user_id = ?').get(userId).c;
  return {
    bookmarks,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
}

function isBookmarked(userId, bookId) {
  const db = getDb();
  ensureTable(db);
  return !!db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND book_id = ?').get(userId, bookId);
}

// Route handlers
function addRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const bookId = parseInt(req.params.bookId);
  if (!bookId) return res.status(400).json({ error: 'invalid_book_id' });
  const { page, note } = req.body;
  try {
    const result = addBookmark(req.user.id, bookId, page, note);
    if (!result.ok) return res.status(400).json(result);
    return res.json(result);
  } catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function removeRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const bookId = parseInt(req.params.bookId);
  if (!bookId) return res.status(400).json({ error: 'invalid_book_id' });
  try {
    const result = removeBookmark(req.user.id, bookId);
    if (!result.ok) return res.status(404).json(result);
    return res.json(result);
  } catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function listRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    return res.json({ ok: true, ...getBookmarks(req.user.id, page, limit) });
  } catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function checkRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const bookId = parseInt(req.params.bookId);
  if (!bookId) return res.status(400).json({ error: 'invalid_book_id' });
  try {
    const bookmarked = isBookmarked(req.user.id, bookId);
    return res.json({ ok: true, bookmarked });
  } catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

module.exports = {
  addBookmark, removeBookmark, getBookmarks, isBookmarked,
  addRoute, removeRoute, listRoute, checkRoute, ensureTable
};
