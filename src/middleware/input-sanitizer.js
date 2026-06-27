'use strict';

const ALLOWED_EXT = [
  '.txt','.pdf','.epub','.mobi','.html','.htm',
  '.md','.markdown','.docx','.doc','.rtf','.odt',
  '.fb2','.azw','.azw3','.djvu','.cbz','.cbr',
];

function sanitizeText(input, maxLen = 500) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>"']/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/mhtml:/gi, '')
    .trim()
    .slice(0, maxLen);
}

function sanitizeFilename(name) {
  if (typeof name !== 'string') return 'unnamed';
  return name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i, '_$1$2')
    .trim()
    .slice(0, 200) || 'unnamed';
}

function isAllowedExtension(filename) {
  if (typeof filename !== 'string') return false;
  const ext = '.' + filename.split('.').pop().toLowerCase();
  return ALLOWED_EXT.includes(ext);
}

function getExtension(filename) {
  if (typeof filename !== 'string') return '';
  const parts = filename.split('.');
  return parts.length > 1 ? '.' + parts.pop().toLowerCase() : '';
}

function assertSafeExtension(filename) {
  const ext = getExtension(filename);
  if (!ALLOWED_EXT.includes(ext)) {
    throw new Error('Unsupported file extension: ' + ext);
  }
  return ext;
}

function sanitizeMeta(value, max = 500) { return sanitizeText(value, max); }

module.exports = {
  sanitizeText, sanitizeFilename, sanitizeMeta,
  ALLOWED_EXT, isAllowedExtension, getExtension, assertSafeExtension,
};

