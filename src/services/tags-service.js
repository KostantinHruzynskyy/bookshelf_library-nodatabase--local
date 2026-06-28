'use strict';
const { getDb } = require('../database/connection');
const { sanitizeText } = require('../middleware/input-sanitizer');

function ensureTables(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, color TEXT DEFAULT '#8B4513', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS book_tags_new (book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE, tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY (book_id, tag_id));
    CREATE INDEX IF NOT EXISTS idx_btn_tag ON book_tags_new(tag_id);
    CREATE INDEX IF NOT EXISTS idx_btn_book ON book_tags_new(book_id);`);
}

function createTag(name, color) {
  const db = getDb(); ensureTables(db);
  const clean = sanitizeText(name, 50).toLowerCase().trim();
  if (!clean) return { ok: false, error: 'invalid_name' };
  const existing = db.prepare('SELECT * FROM tags WHERE name = ?').get(clean);
  if (existing) return { ok: true, tag: existing };
  const r = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(clean, color || '#8B4513');
  return { ok: true, tag: db.prepare('SELECT * FROM tags WHERE id = ?').get(r.lastInsertRowid) };
}

function listTags() {
  const db = getDb(); ensureTables(db);
  return db.prepare('SELECT t.*, COUNT(bt.book_id) as book_count FROM tags t LEFT JOIN book_tags_new bt ON t.id = bt.tag_id GROUP BY t.id ORDER BY t.name').all();
}

function deleteTag(tagId) {
  const db = getDb(); ensureTables(db);
  db.prepare('DELETE FROM book_tags_new WHERE tag_id = ?').run(tagId);
  const r = db.prepare('DELETE FROM tags WHERE id = ?').run(tagId);
  return r.changes > 0 ? { ok: true } : { ok: false, error: 'not_found' };
}

function addTagToBook(bookId, tagId) {
  const db = getDb(); ensureTables(db);
  db.prepare('INSERT OR IGNORE INTO book_tags_new (book_id, tag_id) VALUES (?, ?)').run(bookId, tagId);
  return { ok: true };
}

function removeTagFromBook(bookId, tagId) {
  const db = getDb(); ensureTables(db);
  db.prepare('DELETE FROM book_tags_new WHERE book_id = ? AND tag_id = ?').run(bookId, tagId);
  return { ok: true };
}

function getBookTags(bookId) {
  const db = getDb(); ensureTables(db);
  return db.prepare('SELECT t.* FROM tags t JOIN book_tags_new bt ON t.id = bt.tag_id WHERE bt.book_id = ? ORDER BY t.name').all(bookId);
}

function getBooksByTag(tagId, page, limit) {
  page = page || 1; limit = Math.min(limit || 20, 50);
  const db = getDb(); ensureTables(db);
  const offset = (page - 1) * limit;
  const books = db.prepare('SELECT b.* FROM books b JOIN book_tags_new bt ON b.id = bt.book_id WHERE bt.tag_id = ? AND b.is_active = 1 ORDER BY b.created_at DESC LIMIT ? OFFSET ?').all(tagId, limit, offset);
  const total = db.prepare('SELECT COUNT(*) as c FROM book_tags_new WHERE tag_id = ?').get(tagId).c;
  return { books, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

function createTagRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const { name, color } = req.body;
  try { const r = createTag(name, color); return r.ok ? res.json(r) : res.status(400).json(r); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function listTagsRoute(req, res) {
  try { return res.json({ ok: true, tags: listTags() }); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function deleteTagRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  try { const r = deleteTag(parseInt(req.params.tagId)); return r.ok ? res.json(r) : res.status(404).json(r); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function addTagToBookRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const bookId = parseInt(req.params.bookId); const { tagId } = req.body;
  if (!bookId || !tagId) return res.status(400).json({ error: 'missing_fields' });
  try { return res.json(addTagToBook(bookId, parseInt(tagId))); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function removeTagFromBookRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const bookId = parseInt(req.params.bookId); const tagId = parseInt(req.params.tagId);
  if (!bookId || !tagId) return res.status(400).json({ error: 'missing_fields' });
  try { return res.json(removeTagFromBook(bookId, tagId)); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function getBookTagsRoute(req, res) {
  const bookId = parseInt(req.params.bookId);
  if (!bookId) return res.status(400).json({ error: 'invalid_book_id' });
  try { return res.json({ ok: true, tags: getBookTags(bookId) }); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function getBooksByTagRoute(req, res) {
  const tagId = parseInt(req.params.tagId);
  if (!tagId) return res.status(400).json({ error: 'invalid_tag_id' });
  try { const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 20; return res.json({ ok: true, ...getBooksByTag(tagId, page, limit) }); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

module.exports = { createTag, listTags, deleteTag, addTagToBook, removeTagFromBook, getBookTags, getBooksByTag, createTagRoute, listTagsRoute, deleteTagRoute, addTagToBookRoute, removeTagFromBookRoute, getBookTagsRoute, getBooksByTagRoute, ensureTables };
