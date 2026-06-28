'use strict';
const { getDb } = require('../database/connection');

function getDashboardAnalytics() {
  const db = getDb();
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const activeUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_active = 1').get().c;
  const totalBooks = db.prepare('SELECT COUNT(*) as c FROM books WHERE is_active = 1').get().c;
  const totalRatings = db.prepare('SELECT COUNT(*) as c FROM book_ratings').get().c || 0;
  const avgRating = db.prepare('SELECT AVG(rating) as avg FROM book_ratings').get().avg || 0;
  const totalComments = db.prepare('SELECT COUNT(*) as c FROM comments').get().c || 0;
  const totalBookmarks = db.prepare('SELECT COUNT(*) as c FROM bookmarks').get().c || 0;
  const totalWishlist = db.prepare('SELECT COUNT(*) as c FROM wishlist').get().c || 0;
  const totalDownloads = db.prepare('SELECT COALESCE(SUM(downloads), 0) as s FROM books').get().s;
  const totalViews = db.prepare('SELECT COALESCE(SUM(views), 0) as s FROM books').get().s;
  const activeSessions = db.prepare("SELECT COUNT(*) as c FROM sessions WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))").get().c;
  const unverifiedUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_email_verified = 0').get().c;
  const flaggedComments = db.prepare('SELECT COUNT(*) as c FROM comments WHERE is_flagged = 1').get().c || 0;

  const topBooks = db.prepare('SELECT b.id, b.title, b.author, b.downloads, b.views, AVG(r.rating) as avg_rating, COUNT(r.id) as rating_count FROM books b LEFT JOIN book_ratings r ON b.id = r.book_id WHERE b.is_active = 1 GROUP BY b.id ORDER BY b.views DESC, avg_rating DESC LIMIT 10').all();
  const topRated = db.prepare('SELECT b.id, b.title, b.author, AVG(r.rating) as avg_rating, COUNT(r.id) as rating_count FROM books b JOIN book_ratings r ON b.id = r.book_id GROUP BY b.id HAVING rating_count >= 1 ORDER BY avg_rating DESC LIMIT 10').all();
  const recentUsers = db.prepare('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 10').all();
  const recentRatings = db.prepare('SELECT r.id, r.rating, r.created_at, u.username, b.title as book_title FROM book_ratings r JOIN users u ON r.user_id = u.id JOIN books b ON r.book_id = b.id ORDER BY r.created_at DESC LIMIT 10').all();

  const formatData = db.prepare('SELECT file_format, COUNT(*) as count FROM books WHERE is_active = 1 GROUP BY file_format ORDER BY count DESC').all();
  const categoryData = db.prepare('SELECT c.name_key, COUNT(b.id) as count FROM categories c LEFT JOIN books b ON b.category_id = c.id AND b.is_active = 1 GROUP BY c.id ORDER BY count DESC LIMIT 10').all();

  const userGrowth = db.prepare("SELECT DATE(created_at) as date, COUNT(*) as count FROM users GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30").all();
  const bookGrowth = db.prepare("SELECT DATE(created_at) as date, COUNT(*) as count FROM books GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30").all();

  return {
    overview: { totalUsers, activeUsers, totalBooks, totalRatings, avgRating: Math.round(avgRating * 10) / 10, totalComments, totalBookmarks, totalWishlist, totalDownloads, totalViews, activeSessions, unverifiedUsers, flaggedComments },
    topBooks, topRated, recentUsers, recentRatings,
    charts: { formatData, categoryData, userGrowth: userGrowth.reverse(), bookGrowth: bookGrowth.reverse() }
  };
}

function getAdminAnalytics(req, res) {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  if (!['admin','moderator'].includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });
  try { return res.json({ ok: true, ...getDashboardAnalytics() }); }
  catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

function getPublicStats(req, res) {
  try {
    const db = getDb();
    const totalBooks = db.prepare('SELECT COUNT(*) as c FROM books WHERE is_active = 1').get().c;
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_active = 1').get().c;
    const totalRatings = db.prepare('SELECT COUNT(*) as c FROM book_ratings').get().c || 0;
    const avgRating = db.prepare('SELECT AVG(rating) as avg FROM book_ratings').get().avg || 0;
    return res.json({ ok: true, stats: { totalBooks, totalUsers, totalRatings, avgRating: Math.round(avgRating * 10) / 10 } });
  } catch (e) { return res.status(500).json({ error: 'failed', message: e.message }); }
}

module.exports = { getDashboardAnalytics, getAdminAnalytics, getPublicStats };
