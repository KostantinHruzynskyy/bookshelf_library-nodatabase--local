'use strict';

const fs = require('fs');
const path = require('path');

const BANNED_EXT = new Set([
  '.exe','.bat','.cmd','.sh','.ps1','.dll','.so','.dylib','.scr',
  '.vbs','.js','.wsf','.jar','.msi','.app','.pkg','.deb','.rpm',
]);

function isBannedExtension(ext) { return BANNED_EXT.has(ext.toLowerCase()); }

function scanUpload(getDb, filePath, originalFilename, userId, bookId) {
  const ext = path.extname(originalFilename).toLowerCase();
  const result = { clean: true, warnings: [], blocks: [] };

  if (isBannedExtension(ext)) result.blocks.push('banned_extension');
  if (result.blocks.length) {
    try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
    return { ...result, clean: false };
  }

  const size = fs.statSync(filePath).size;
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO file_scan_results (book_id, scan_type, result, details)
       VALUES (?, 'mime_validation', ?, ?)`
    ).run(
      bookId || null,
      result.clean ? 'suspicious' : 'blocked',
      JSON.stringify({ ext, size })
    );
  } catch (e) { /* noop */ }

  return result;
}

function computeSHA256(filePath) {
  return new Promise((resolve, reject) => {
    const h = require('crypto').createHash('sha256');
    fs.createReadStream(filePath)
      .on('data', d => h.update(d))
      .on('end', () => resolve(h.digest('hex')))
      .on('error', reject);
  });
}

module.exports = { isBannedExtension, scanUpload, computeSHA256 };

