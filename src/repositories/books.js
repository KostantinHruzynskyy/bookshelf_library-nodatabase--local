'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db');
const { sanitizeText, sanitizeFilename, getExtension, assertSafeExtension, ALLOWED_EXT } = require('../security/input-sanitizer');

function extractText(ext, filePath) {
  try {
    if (['.txt','.md','.markdown','.html','.htm','.rtf'].includes(ext)) {
      let text = fs.readFileSync(filePath, 'utf8');
      if (['.html','.htm'].includes(ext)) {
        text = text.replace(/<style[^>]*>[\s\S]*?</style>/gi, '')
                   .replace(/<script[^>]*>[\s\S]*?</script>/gi, '')
                   .replace(/<[^>]+>/g, '')
                   .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                   .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
                   .replace(/\n{3,}/g, '\n\n').trim();
      }
      if (ext === '.rtf') {
        text = text.replace(/\\[a-z]+\d*\s?/gi, '').replace(/[{}]/g, '').trim();
      }
      return text;
    }
  } catch (e) { return ''; }
  return '';
}

function getFormatIcon(ext) {
  return {'.txt':'📄','.pdf':'📕','.epub':'📗','.mobi':'📘','.html':'🌐','.htm':'🌐','.md':'📝','.markdown':'📝','.docx':'📘','.doc':'📘','.rtf':'📄','.odt':'📄','.fb2':'📖','.azw':'📱','.azw3':'📱','.djvu':'📑','.cbz':'💬','.cbr':'💬'}[ext] || '📚';
}

function getFormatLabel(ext) {
  return {'.txt':'Plain Text','.pdf':'PDF','.epub':'EPUB','.mobi':'MOBI','.html':'HTML','.htm':'HTML','.md':'Markdown','.markdown':'Markdown','.docx':'Word DOCX','.doc':'Word DOC','.rtf':'RTF','.odt':'OpenDocument','.fb2':'FictionBook','.azw':'Kindle AZW','.azw3':'Kindle AZW3','.djvu':'DjVu','.cbz':'Comic CBZ','.cbr':'Comic CBR'}[ext] || ext.replace('.', '').toUpperCase();
}

function computeRelativePath(filePath) {
  if (path.isAbsolute(filePath)) {
    return path.relative(process.cwd(), filePath).split(path.sep).join('/');
  }
  return filePath;
}

class BooksRepository {
  constructor() {
    this.db = getDb();
  }

  mapRow(row) {
    const ext = (row.file_format || '').toLowerCase();
    const authorsStmt = this.db.prepare('SELECT author_name FROM book_authors WHERE book_id = ?');
    const authors = authorsStmt.all(row.id).map(a => a.author_name);
    return {
      id: row.id,
      title: row.title,
      author: authors.join(', '),
      authors: authors,
      description: row.description,
      color: row.color || '#8B4513',
      file: row.file_path,
      format: ext,
      formatIcon: getFormatIcon(ext),
      formatLabel: getFormatLabel(ext),
      fileSize: row.file_size,
      extractedText: row.extracted_text || null,
      readFilePath: row.read_file_path || null,
      originalFile: row.original_file || null,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  getAll() {
    const stmt = this.db.prepare('SELECT * FROM books WHERE is_active = 1 ORDER BY created_at DESC');
    return stmt.all().map(row => this.mapRow(row));
  }

  getById(id) {
    const stmt = this.db.prepare('SELECT * FROM books WHERE id = ? AND is_active = 1');
    const row = stmt.get(id);
    return row ? this.mapRow(row) : null;
  }

  search(term) {
    const like = `%${term}%`;
    const stmt = this.db.prepare("SELECT * FROM books WHERE (title LIKE ? OR author LIKE ? OR description LIKE ?) AND is_active = 1 ORDER BY created_at DESC");
    return stmt.all(like, like, like).map(row => this.mapRow(row));
  }

  create(data) {
    const tx = this.db.transaction(() => {
      const stmt = this.db.prepare(
        'INSERT INTO books (title, description, language, category_id, year, isbn, pages, publisher, cover_image, file_path, file_format, file_size, uploaded_by, is_recommended, is_public_domain, downloads, views, color, extracted_text, read_file_path, original_file, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      const info = stmt.run(
        data.title || '',
        data.description || '',
        data.language || 'en',
        data.categoryId || null,
        data.year || null,
        data.isbn || null,
        data.pages || null,
        data.publisher || null,
        data.cover_image || null,
        data.file_path || '',
        data.file_format || '.txt',
        data.file_size || 0,
        data.uploadedBy || null,
        data.isRecommended ? 1 : 0,
        data.isPublicDomain ? 1 : 0,
        0,
        0,
        data.color || '#8B4513',
        data.extractedText || null,
        data.readFilePath || null,
        data.originalFile || null,
        1
      );

      if (data.authors && Array.isArray(data.authors)) {
        const insAuthor = this.db.prepare('INSERT INTO book_authors (book_id, author_name) VALUES (?, ?)');
        const tx2 = this.db.transaction(() => {
          for (const a of data.authors) {
            insAuthor.run(info.lastInsertRowid, a);
          }
        });
        tx2();
      }

      return this.getById(info.lastInsertRowid);
    });
    return tx();
  }

  update(id, data) {
    const existing = this.getById(id);
    if (!existing) return null;

    const stmt = this.db.prepare(
      'UPDATE books SET title = COALESCE(?, title), description = COALESCE(?, description), language = COALESCE(?, language), category_id = COALESCE(?, category_id), year = COALESCE(?, year), isbn = COALESCE(?, isbn), pages = COALESCE(?, pages), publisher = COALESCE(?, publisher), cover_image = COALESCE(?, cover_image), file_path = COALESCE(?, file_path), file_format = COALESCE(?, file_format), file_size = COALESCE(?, file_size), color = COALESCE(?, color), extracted_text = COALESCE(?, extracted_text), read_file_path = COALESCE(?, read_file_path), original_file = COALESCE(?, original_file), is_recommended = COALESCE(?, is_recommended), is_public_domain = COALESCE(?, is_public_domain), updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run(
      data.title,
      data.description,
      data.language,
      data.categoryId,
      data.year,
      data.isbn,
      data.pages,
      data.publisher,
      data.cover_image,
      data.file_path,
      data.file_format,
      data.file_size,
      data.color,
      data.extractedText,
      data.readFilePath,
      data.originalFile,
      data.isRecommended != null ? (data.isRecommended ? 1 : 0) : null,
      data.isPublicDomain != null ? (data.isPublicDomain ? 1 : 0) : null,
      id
    );

    if (data.authors && Array.isArray(data.authors)) {
      this.db.prepare('DELETE FROM book_authors WHERE book_id = ?').run(id);
      const insAuthor = this.db.prepare('INSERT INTO book_authors (book_id, author_name) VALUES (?, ?)');
      const tx = this.db.transaction(() => {
        for (const a of data.authors) {
          insAuthor.run(id, a);
        }
      });
      tx();
    }

    return this.getById(id);
  }

  delete(id) {
    const existing = this.getById(id);
    if (!existing) return false;
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM book_authors WHERE book_id = ?').run(id);
      this.db.prepare('DELETE FROM books WHERE id = ?').run(id);
    });
    return tx();
  }

  importFromJsonArray(jsonArray) {
    const stmt = this.db.prepare(
      'INSERT OR IGNORE INTO books (id, title, description, color, file_path, file_format, file_size, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const tx = this.db.transaction(() => {
      for (const b of jsonArray) {
        const id = b.id || Date.now() + Math.floor(Math.random() * 1e6);
        const ext = (b.format || path.extname(b.file || '')).toLowerCase();
        stmt.run(id, b.title, b.description || '', b.color || '#8B4513', b.file || '', ext || '.txt', b.fileSize || 0, new Date().toISOString(), new Date().toISOString());
      }
    });
    tx();
  }
}

module.exports = { BooksRepository };

