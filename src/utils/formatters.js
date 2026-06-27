'use strict';

export function getFormatIcon(ext) {
  return {
    '.txt': '📄', '.pdf': '📕', '.epub': '📗', '.mobi': '📘',
    '.html': '🌐', '.htm': '🌐', '.md': '📝', '.markdown': '📝',
    '.docx': '📘', '.doc': '📘', '.rtf': '📄', '.odt': '📄',
    '.fb2': '📖', '.azw': '📱', '.azw3': '📱', '.djvu': '📑',
    '.cbz': '💬', '.cbr': '💬'
  }[ext] || '📚';
}

export function getFormatLabel(ext) {
  return {
    '.txt': 'Plain Text', '.pdf': 'PDF', '.epub': 'EPUB', '.mobi': 'MOBI',
    '.html': 'HTML', '.htm': 'HTML', '.md': 'Markdown', '.markdown': 'Markdown',
    '.docx': 'Word DOCX', '.doc': 'Word DOC', '.rtf': 'RTF', '.odt': 'OpenDocument',
    '.fb2': 'FictionBook', '.azw': 'Kindle AZW', '.azw3': 'Kindle AZW3',
    '.djvu': 'DJVU', '.cbz': 'Comic CBZ', '.cbr': 'Comic CBR'
  }[ext] || ext.replace('.', '').toUpperCase();
}
