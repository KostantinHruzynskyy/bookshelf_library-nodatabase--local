'use strict';

const fs = require('fs');
const { getDb } = require('../database/connection');
const { logger } = require('../config/logger');

async function exportUserCSV(userId) {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('Utente non trovato');
    
    const books = db.prepare('SELECT id, title, file_format, created_at FROM books WHERE uploaded_by = ? ORDER BY created_at DESC').all(userId);
    
    let csv = 'Tipo,ID,Titolo,Formato,Data\n';
    for (const book of books) {
      csv += `Libro,"${book.id}","${book.title}","${book.file_format}","${book.created_at}"\n`;
    }
    
    logger.info('User CSV exported', { userId, count: books.length });
    return { success: true, data: csv, filename: `export_${user.username}_${Date.now()}.csv`, count: books.length };
  } catch (error) {
    logger.error('CSV export failed', { error: error.message });
    throw error;
  }
}

async function exportBooksCSV(filters = {}) {
  try {
    const db = getDb();
    let query = 'SELECT id, title, file_format, downloads, created_at FROM books';
    const params = [];
    if (filters.format) { query += ' WHERE file_format = ?'; params.push(filters.format); }
    query += ' ORDER BY created_at DESC';
    const books = db.prepare(query).all(...params);
    
    let csv = 'ID,Titolo,Formato,Downloads,Data\n';
    for (const book of books) {
      csv += `"${book.id}","${book.title}","${book.file_format}","${book.downloads || 0}","${book.created_at}"\n`;
    }
    
    logger.info('Books CSV exported', { count: books.length });
    return { success: true, data: csv, filename: `books_export_${Date.now()}.csv`, count: books.length };
  } catch (error) {
    logger.error('Books CSV export failed', { error: error.message });
    throw error;
  }
}

async function exportStatsCSV() {
  try {
    const db = getDb();
    const stats = {
      users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
      books: db.prepare('SELECT COUNT(*) as c FROM books').get().c,
      loans: db.prepare("SELECT COUNT(*) as c FROM loans WHERE status = 'active'").get().c
    };
    
    let csv = 'Metrica,Valore\n';
    csv += `Utenti,${stats.users}\n`;
    csv += `Libri,${stats.books}\n`;
    csv += `Prestiti Attivi,${stats.loans}\n`;
    
    return { success: true, data: csv, filename: `stats_${Date.now()}.csv` };
  } catch (error) {
    throw error;
  }
}

async function handleExportUserCSV(req, res) {
  try {
    const result = await exportUserCSV(req.user.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send('﻿' + result.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handleExportBooksCSV(req, res) {
  try {
    const result = await exportBooksCSV(req.query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send('﻿' + result.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handleExportStats(req, res) {
  try {
    const result = await exportStatsCSV();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send('﻿' + result.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { exportUserCSV, exportBooksCSV, exportStatsCSV, handleExportUserCSV, handleExportBooksCSV, handleExportStats };