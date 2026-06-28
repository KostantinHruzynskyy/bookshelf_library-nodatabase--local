'use strict';

const fs = require('fs');
const path = require('path');

function searchBooks(query, options) {
  options = options || {};
  const booksPath = options.booksPath || path.join(__dirname, '../../books.json');
  const BOOKS_FILE = booksPath;

  let books;
  try {
    books = JSON.parse(fs.readFileSync(BOOKS_FILE, 'utf8'));
  } catch (e) {
    books = [];
  }

  const term = (query || '').toLowerCase().trim();

  // Search across multiple fields
  let results = term ? books.filter(b => {
    const searchable = [
      b.title, b.author, b.description,
      b.publisher, b.isbn, b.formatLabel
    ].filter(Boolean).map(s => s.toLowerCase()).join(' ');

    // Simple tokenized search with AND logic
    const tokens = term.split(/\s+/).filter(Boolean);
    return tokens.every(t => searchable.includes(t));
  }) : books;

  // Apply filters
  if (options.format) {
    results = results.filter(b => (b.format || '').toLowerCase() === options.format.toLowerCase());
  }
  if (options.minRating) {
    results = results.filter(b => b.averageRating >= parseFloat(options.minRating));
  }
  if (options.category) {
    results = results.filter(b => b.category_id === parseInt(options.category));
  }
  if (options.language) {
    results = results.filter(b => b.language === options.language);
  }

  // Sorting
  const sort = options.sort || 'relevance';
  if (sort === 'title') results.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  else if (sort === 'author') results.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
  else if (sort === 'newest') results.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  else if (sort === 'oldest') results.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
  else if (sort === 'downloads') results.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
  else if (sort === 'views') results.sort((a, b) => (b.views || 0) - (a.views || 0));

  // Pagination
  const page = parseInt(options.page) || 1;
  const limit = Math.min(parseInt(options.limit) || 20, 100);
  const offset = (page - 1) * limit;
  const paged = results.slice(offset, offset + limit);

  return {
    results: paged,
    total: results.length,
    pagination: {
      page, limit,
      total: results.length,
      totalPages: Math.ceil(results.length / limit)
    }
  };
}

function searchRoute(req, res) {
  try {
    const query = req.query.q || '';
    const options = {
      format: req.query.format,
      minRating: req.query.minRating,
      category: req.query.category,
      language: req.query.language,
      sort: req.query.sort,
      page: req.query.page,
      limit: req.query.limit
    };
    const result = searchBooks(query, options);
    return res.json({ ok: true, ...result });
  } catch (e) {
    return res.status(500).json({ error: 'search_failed', message: e.message });
  }
}

module.exports = { searchBooks, searchRoute };
