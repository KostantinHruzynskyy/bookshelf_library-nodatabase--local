'use strict';

const { getDb } = require('../database/connection');
const { sanitizeText } = require('../middleware/input-sanitizer');
const { validateRatingInput, checkRatingRateLimit } = require('../../security/ratings-secure');

function ensureRatingsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      review TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(book_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_ratings_book ON book_ratings(book_id);
    CREATE INDEX IF NOT EXISTS idx_ratings_user ON book_ratings(user_id);
  `);
}

function submitRating(userId, bookId, rating, review) {
  const db = getDb();
  ensureRatingsTable(db);
  if (!checkRatingRateLimit(userId)) {
    return { ok: false, error: 'rate_limited', message: 'Too many ratings. Please wait.' };
  }
  const book = db.prepare('SELECT id FROM books WHERE id = ? AND is_active = 1').get(bookId);
  if (!book) return { ok: false, error: 'book_not_found', message: 'Book not found.' };
  const cleanReview = sanitizeText(review || '', 2000);
  const existing = db.prepare('SELECT id FROM book_ratings WHERE book_id = ? AND user_id = ?').get(bookId, userId);
  if (existing) {
    db.prepare('UPDATE book_ratings SET rating = ?, review = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(rating, cleanReview, existing.id);
    return { ok: true, message: 'Rating updated.', rating, review: cleanReview };
  }
  db.prepare('INSERT INTO book_ratings (book_id, user_id, rating, review) VALUES (?, ?, ?, ?)').run(bookId, userId, rating, cleanReview);
  return { ok: true, message: 'Rating submitted.', rating, review: cleanReview };
}

function deleteRating(userId, bookId) {
  const db = getDb();
  ensureRatingsTable(db);
  const result = db.prepare('DELETE FROM book_ratings WHERE book_id = ? AND user_id = ?').run(bookId, userId);
  if (result.changes === 0) return { ok: false, error: 'not_found', message: 'Rating not found.' };
  return { ok: true, message: 'Rating deleted.' };
}

function getBookRatings(bookId, page, limit) {
  page = page || 1; limit = limit || 10;
  const db = getDb();
  ensureRatingsTable(db);
  const offset = (page - 1) * limit;
  const ratings = db.prepare(
    `SELECT r.id, r.rating, r.review, r.created_at, r.updated_at, u.username
     FROM book_ratings r JOIN users u ON r.user_id = u.id
     WHERE r.book_id = ? ORDER BY r.created_at DESC LIMIT ? OFFSET ?`
  ).all(bookId, limit, offset);
  const stats = db.prepare(
    `SELECT COUNT(*) as total, AVG(rating) as average,
       SUM(CASE WHEN rating=5 THEN 1 ELSE 0 END) as s5,
       SUM(CASE WHEN rating=4 THEN 1 ELSE 0 END) as s4,
       SUM(CASE WHEN rating=3 THEN 1 ELSE 0 END) as s3,
       SUM(CASE WHEN rating=2 THEN 1 ELSE 0 END) as s2,
       SUM(CASE WHEN rating=1 THEN 1 ELSE 0 END) as s1
     FROM book_ratings WHERE book_id = ?`
  ).get(bookId);
  return {
    ratings,
    stats: {
      total: stats.total || 0,
      average: stats.average ? Math.round(stats.average * 10) / 10 : 0,
      distribution: { 5: stats.s5||0, 4: stats.s4||0, 3: stats.s3||0, 2: stats.s2||0, 1: stats.s1||0 }
    },
    pagination: { page, limit, total: stats.total || 0, totalPages: Math.ceil((stats.total||0) / limit) }
  };
}

function getUserRating(userId, bookId) {
  const db = getDb();
  ensureRatingsTable(db);
  return db.prepare('SELECT id, rating, review, created_at, updated_at FROM book_ratings WHERE book_id = ? AND user_id = ?').get(bookId, userId);
}

function submitRatingRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const bookId = parseInt(req.params.bookId);
  if (!bookId) return res.status(400).json({ error: 'invalid_book_id' });
  const validation = validateRatingInput(req.body);
  if (!validation.ok) return res.status(400).json(validation);
  try {
    const result = submitRating(req.user.id, bookId, validation.rating, validation.review);
    if (!result.ok) return res.status(400).json(result);
    return res.json(result);
  } catch (e) { return res.status(500).json({ error: 'rating_failed', message: e.message }); }
}

function getBookRatingsRoute(req, res) {
  const bookId = parseInt(req.params.bookId);
  if (!bookId) return res.status(400).json({ error: 'invalid_book_id' });
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const result = getBookRatings(bookId, page, limit);
    return res.json({ ok: true, ...result });
  } catch (e) { return res.status(500).json({ error: 'fetch_failed', message: e.message }); }
}

function getUserRatingRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const bookId = parseInt(req.params.bookId);
  try {
    const rating = getUserRating(req.user.id, bookId);
    return res.json({ ok: true, rating });
  } catch (e) { return res.status(500).json({ error: 'fetch_failed', message: e.message }); }
}

function deleteRatingRoute(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  const bookId = parseInt(req.params.bookId);
  try {
    const result = deleteRating(req.user.id, bookId);
    if (!result.ok) return res.status(404).json(result);
    return res.json(result);
  } catch (e) { return res.status(500).json({ error: 'delete_failed', message: e.message }); }
}

module.exports = {
  submitRating, deleteRating, getBookRatings, getUserRating,
  submitRatingRoute, getBookRatingsRoute, getUserRatingRoute, deleteRatingRoute,
  ensureRatingsTable
};

