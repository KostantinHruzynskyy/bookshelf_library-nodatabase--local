'use strict';

const { getDb } = require('../database/connection');
const { logger, logAudit } = require('../config/logger');

const LOAN_PERIOD_DAYS = 14;
const MAX_LOANS_PER_USER = 5;
const MAX_RENEWALS = 2;

function ensureTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      borrower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      loaned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      due_date DATETIME NOT NULL,
      returned_at DATETIME,
      renewed_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'returned', 'overdue', 'lost')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_loans_book ON loans(book_id);
    CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans(borrower_id);
    CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
    CREATE INDEX IF NOT EXISTS idx_loans_due ON loans(due_date);
  `);
}

async function createLoan(req, res) {
  try {
    const { bookId } = req.params;
    const { lenderId, notes } = req.body;
    const borrowerId = req.user.id;

    if (!bookId) return res.status(400).json({ error: 'missing_book', message: 'ID libro richiesto' });

    const db = getDb();
    ensureTables(db);

    const activeLoans = db.prepare('SELECT COUNT(*) as count FROM loans WHERE borrower_id = ? AND status = ?')
      .get(borrowerId, 'active');
    if (activeLoans.count >= MAX_LOANS_PER_USER) {
      return res.status(400).json({ error: 'loan_limit_reached', message: `Limite ${MAX_LOANS_PER_USER} prestiti attivi raggiunto` });
    }

    const existingLoan = db.prepare('SELECT * FROM loans WHERE book_id = ? AND status = ?').get(bookId, 'active');
    if (existingLoan) return res.status(400).json({ error: 'book_unavailable', message: 'Libro già in prestito' });

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
    if (!book) return res.status(404).json({ error: 'book_not_found', message: 'Libro non trovato' });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + LOAN_PERIOD_DAYS);

    const result = db.prepare('INSERT INTO loans (book_id, borrower_id, lender_id, due_date, notes) VALUES (?, ?, ?, ?, ?)')
      .run(bookId, borrowerId, lenderId || null, dueDate.toISOString(), notes || null);

    logAudit({ userId: borrowerId, action: 'loan.create', resource: 'loan', resourceId: result.lastInsertRowid, details: { bookId, dueDate }, ip: req.ip });
    logger.info('Loan created', { loanId: result.lastInsertRowid, bookId, borrowerId });

    return res.status(201).json({ success: true, loan: { id: result.lastInsertRowid, bookId, dueDate: dueDate.toISOString(), status: 'active' } });

  } catch (error) {
    logger.error('Failed to create loan', { error: error.message });
    return res.status(500).json({ error: 'loan_failed', message: error.message });
  }
}

async function returnBook(req, res) {
  try {
    const { loanId } = req.params;
    const userId = req.user.id;
    const db = getDb();
    ensureTables(db);

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
    if (!loan) return res.status(404).json({ error: 'loan_not_found' });
    if (loan.borrower_id !== userId && !['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    db.prepare("UPDATE loans SET status = 'returned', returned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(loanId);
    logAudit({ userId, action: 'loan.return', resource: 'loan', resourceId: loanId, details: { bookId: loan.book_id }, ip: req.ip });
    return res.json({ success: true, message: 'Libro restituito' });

  } catch (error) {
    logger.error('Failed to return book', { error: error.message });
    return res.status(500).json({ error: 'return_failed', message: error.message });
  }
}

async function renewLoan(req, res) {
  try {
    const { loanId } = req.params;
    const userId = req.user.id;
    const db = getDb();
    ensureTables(db);

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
    if (!loan) return res.status(404).json({ error: 'loan_not_found' });
    if (loan.borrower_id !== userId) return res.status(403).json({ error: 'forbidden' });
    if (loan.renewed_count >= MAX_RENEWALS) return res.status(400).json({ error: 'max_renewals', message: `Limite ${MAX_RENEWALS} rinnovi raggiunto` });

    const newDueDate = new Date(loan.due_date);
    newDueDate.setDate(newDueDate.getDate() + LOAN_PERIOD_DAYS);
    db.prepare('UPDATE loans SET due_date = ?, renewed_count = renewed_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newDueDate.toISOString(), loanId);

    logAudit({ userId, action: 'loan.renew', resource: 'loan', resourceId: loanId, details: { newDueDate }, ip: req.ip });
    return res.json({ success: true, message: 'Prestito rinnovato', newDueDate: newDueDate.toISOString(), renewalsLeft: MAX_RENEWALS - loan.renewed_count - 1 });

  } catch (error) {
    logger.error('Failed to renew loan', { error: error.message });
    return res.status(500).json({ error: 'renew_failed', message: error.message });
  }
}

async function listUserLoans(req, res) {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const db = getDb();
    ensureTables(db);

    let query = `SELECT l.*, b.title as book_title, b.cover_image, u.username as borrower_name
      FROM loans l JOIN books b ON l.book_id = b.id JOIN users u ON l.borrower_id = u.id WHERE l.borrower_id = ?`;
    const params = [userId];
    if (status) { query += ' AND l.status = ?'; params.push(status); }
    query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const loans = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM loans WHERE borrower_id = ?' + (status ? ' AND status = ?' : '')).get(...(status ? [userId, status] : [userId]));

    return res.json({ loans, pagination: { page: parseInt(page), limit: parseInt(limit), total: total.count } });

  } catch (error) {
    logger.error('Failed to list loans', { error: error.message });
    return res.status(500).json({ error: 'list_failed', message: error.message });
  }
}

async function getLoanDetails(req, res) {
  try {
    const { loanId } = req.params;
    const userId = req.user.id;
    const db = getDb();
    ensureTables(db);

    const loan = db.prepare(`SELECT l.*, b.title as book_title, b.cover_image, b.description,
      borrower.username as borrower_name, lender.username as lender_name
      FROM loans l JOIN books b ON l.book_id = b.id
      JOIN users borrower ON l.borrower_id = borrower.id
      LEFT JOIN users lender ON l.lender_id = lender.id WHERE l.id = ?`).get(loanId);

    if (!loan) return res.status(404).json({ error: 'loan_not_found' });
    if (loan.borrower_id !== userId && loan.lender_id !== userId && !['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    return res.json({ loan });

  } catch (error) {
    logger.error('Failed to get loan details', { error: error.message });
    return res.status(500).json({ error: 'get_failed', message: error.message });
  }
}

async function getOverdueLoans(req, res) {
  try {
    const db = getDb();
    ensureTables(db);
    const overdueLoans = db.prepare(`SELECT l.*, b.title as book_title, u.username as borrower_name, u.email as borrower_email
      FROM loans l JOIN books b ON l.book_id = b.id JOIN users u ON l.borrower_id = u.id
      WHERE l.status = 'active' AND l.due_date < datetime('now') ORDER BY l.due_date ASC`).all();
    return res.json({ overdueLoans, count: overdueLoans.length });
  } catch (error) {
    logger.error('Failed to get overdue loans', { error: error.message });
    return res.status(500).json({ error: 'get_failed', message: error.message });
  }
}

async function updateOverdueStatus() {
  try {
    const db = getDb();
    ensureTables(db);
    const result = db.prepare("UPDATE loans SET status = 'overdue', updated_at = CURRENT_TIMESTAMP WHERE status = 'active' AND due_date < datetime('now')").run();
    if (result.changes > 0) logger.info('Updated overdue loans', { count: result.changes });
    return result.changes;
  } catch (error) {
    logger.error('Failed to update overdue status', { error: error.message });
    return 0;
  }
}

module.exports = { 
  createLoan, returnBook, renewLoan, listUserLoans, getLoanDetails, 
  getOverdueLoans, updateOverdueStatus, ensureTables, 
  LOAN_PERIOD_DAYS, MAX_LOANS_PER_USER, MAX_RENEWALS 
};