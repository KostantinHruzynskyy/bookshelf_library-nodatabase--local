'use strict';
const { getDb } = require('../database/connection');
const { sanitizeText } = require('../middleware/input-sanitizer');

function ensureTable(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE, content TEXT NOT NULL, is_flagged INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS idx_comments_book ON comments(book_id);
    CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);`);
}

function addComment(bookId, userId, content, parentId) {
  const db = getDb(); ensureTable(db);
  const clean = sanitizeText(content, 2000);
  if (!clean) return { ok: false, error: 'empty_content' };
  const book = db.prepare('SELECT id FROM books WHERE id = ? AND is_active = 1').get(bookId);
  if (!book) return { ok: false, error: 'book_not_found' };
  if (parentId) {
    const parent = db.prepare('SELECT id FROM comments WHERE id = ? AND book_id = ?').get(parentId, bookId);
    if (!parent) return { ok: false, error: 'parent_not_found' };
  }
  const r = db.prepare('INSERT INTO comments (book_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)').run(bookId, userId, clean, parentId || null);
  return { ok: true, id: r.lastInsertRowid };
}

function editComment(commentId, userId, content) {
  const db = getDb(); ensureTable(db);
  const clean = sanitizeText(content, 2000);
  if (!clean) return { ok: false, error: 'empty_content' };
  const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND user_id = ?').get(commentId, userId);
  if (!comment) return { ok: false, error: 'not_found' };
  db.prepare('UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(clean, commentId);
  return { ok: true };
}

function deleteComment(commentId, userId, isAdmin) {
  const db = getDb(); ensureTable(db);
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
  if (!comment) return { ok: false, error: 'not_found' };
  if (comment.user_id !== userId && !isAdmin) return { ok: false, error: 'forbidden' };
  db.prepare('DELETE FROM comments WHERE parent_id = ?').run(commentId);
  db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
  return { ok: true };
}

function getComments(bookId, page, limit) {
  page = page || 1; limit = Math.min(limit || 20, 50);
  const db = getDb(); ensureTable(db);
  const offset = (page - 1) * limit;
  const comments = db.prepare('SELECT c.*, u.username, u.role FROM comments c JOIN users u ON c.user_id = u.id WHERE c.book_id = ? AND c.parent_id IS NULL ORDER BY c.created_at DESC LIMIT ? OFFSET ?').all(bookId, limit, offset);
  for (const c of comments) {
    c.replies = db.prepare('SELECT c.*, u.username, u.role FROM comments c JOIN users u ON c.user_id = u.id WHERE c.parent_id = ? ORDER BY c.created_at ASC').all(c.id);
  }
  const total = db.prepare('SELECT COUNT(*) as c FROM comments WHERE book_id = ? AND parent_id IS NULL').get(bookId).c;
  return { comments, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

function flagComment(commentId) {
  const db = getDb(); ensureTable(db);
  db.prepare('UPDATE comments SET is_flagged = 1 WHERE id = ?').run(commentId);
  return { ok: true };
}

function getFlaggedComments(page, limit) {
  page = page || 1; limit = Math.min(limit || 20, 50);
  const db = getDb(); ensureTable(db);
  const offset = (page - 1) * limit;
  const comments = db.prepare('SELECT c.*, u.username, b.title as book_title FROM comments c JOIN users u ON c.user_id = u.id JOIN books b ON c.book_id = b.id WHERE c.is_flagged = 1 ORDER BY c.created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as c FROM comments WHERE is_flagged = 1').get().c;
  return { comments, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

function unflagComment(commentId) {
  const db = getDb(); ensureTable(db);
  db.prepare('UPDATE comments SET is_flagged = 0 WHERE id = ?').run(commentId);
  return { ok: true };
}

function addRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const bookId = parseInt(req.params.bookId);
  const { content, parentId } = req.body;
  if (!bookId) return res.status(400).json({ error: 'invalid_book_id' });
  try { const r = addComment(bookId, req.user.id, content, parentId); return r.ok ? res.json(r) : res.status(400).json(r); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function editRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const id = parseInt(req.params.id);
  const { content } = req.body;
  try { const r = editComment(id, req.user.id, content); return r.ok ? res.json(r) : res.status(400).json(r); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function deleteRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const id = parseInt(req.params.id);
  try { const r = deleteComment(id, req.user.id, ['admin','moderator'].includes(req.user.role)); return r.ok ? res.json(r) : res.status(400).json(r); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function listRoute(req, res) {
  const bookId = parseInt(req.params.bookId);
  if (!bookId) return res.status(400).json({ error: 'invalid_book_id' });
  try { const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 20; return res.json({ ok: true, ...getComments(bookId, page, limit) }); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function flagRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const id = parseInt(req.params.id);
  try { return res.json(flagComment(id)); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function flaggedListRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  if (!['admin','moderator'].includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });
  try { const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 20; return res.json({ ok: true, ...getFlaggedComments(page, limit) }); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function unflagRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  if (!['admin','moderator'].includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });
  const id = parseInt(req.params.id);
  try { return res.json(unflagComment(id)); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

module.exports = { addComment, editComment, deleteComment, getComments, flagComment, getFlaggedComments, unflagComment, addRoute, editRoute, deleteRoute, listRoute, flagRoute, flaggedListRoute, unflagRoute, ensureTable };
