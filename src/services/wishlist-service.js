'use strict';
const { getDb } = require('../database/connection');

function ensureTable(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS wishlist (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE, priority INTEGER DEFAULT 1, note TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, book_id));
    CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);`);
}

function addToWishlist(userId, bookId, priority, note) {
  const db = getDb(); ensureTable(db);
  const book = db.prepare('SELECT id FROM books WHERE id = ? AND is_active = 1').get(bookId);
  if (!book) return { ok: false, error: 'book_not_found' };
  const existing = db.prepare('SELECT id FROM wishlist WHERE user_id = ? AND book_id = ?').get(userId, bookId);
  if (existing) {
    db.prepare('UPDATE wishlist SET priority = ?, note = ? WHERE id = ?').run(priority || 1, note || '', existing.id);
    return { ok: true, message: 'Wishlist item updated.' };
  }
  db.prepare('INSERT INTO wishlist (user_id, book_id, priority, note) VALUES (?, ?, ?, ?)').run(userId, bookId, priority || 1, note || '');
  return { ok: true, message: 'Added to wishlist.' };
}

function removeFromWishlist(userId, bookId) {
  const db = getDb(); ensureTable(db);
  const r = db.prepare('DELETE FROM wishlist WHERE user_id = ? AND book_id = ?').run(userId, bookId);
  return r.changes > 0 ? { ok: true, message: 'Removed from wishlist.' } : { ok: false, error: 'not_found' };
}

function getWishlist(userId, page, limit) {
  page = page || 1; limit = Math.min(limit || 20, 50);
  const db = getDb(); ensureTable(db);
  const offset = (page - 1) * limit;
  const items = db.prepare(`SELECT w.id, w.priority, w.note, w.created_at, bk.id as book_id, bk.title, bk.author, bk.color, bk.file_format, bk.cover_image FROM wishlist w JOIN books bk ON w.book_id = bk.id WHERE w.user_id = ? ORDER BY w.priority DESC, w.created_at DESC LIMIT ? OFFSET ?`).all(userId, limit, offset);
  const total = db.prepare('SELECT COUNT(*) as c FROM wishlist WHERE user_id = ?').get(userId).c;
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

function isInWishlist(userId, bookId) {
  const db = getDb(); ensureTable(db);
  return !!db.prepare('SELECT id FROM wishlist WHERE user_id = ? AND book_id = ?').get(userId, bookId);
}

function addRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const bookId = parseInt(req.params.bookId);
  if (!bookId) return res.status(400).json({ error: 'invalid_book_id' });
  const { priority, note } = req.body;
  try { const r = addToWishlist(req.user.id, bookId, priority, note); return r.ok ? res.json(r) : res.status(400).json(r); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function removeRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const bookId = parseInt(req.params.bookId);
  if (!bookId) return res.status(400).json({ error: 'invalid_book_id' });
  try { const r = removeFromWishlist(req.user.id, bookId); return r.ok ? res.json(r) : res.status(404).json(r); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function listRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  try { const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 20; return res.json({ ok: true, ...getWishlist(req.user.id, page, limit) }); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function checkRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const bookId = parseInt(req.params.bookId);
  if (!bookId) return res.status(400).json({ error: 'invalid_book_id' });
  try { return res.json({ ok: true, inWishlist: isInWishlist(req.user.id, bookId) }); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

module.exports = { addToWishlist, removeFromWishlist, getWishlist, isInWishlist, addRoute, removeRoute, listRoute, checkRoute, ensureTable };
