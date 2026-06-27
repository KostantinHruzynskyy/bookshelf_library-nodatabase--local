const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

function showDir(dirPath, prefix = '', depth = 0) {
  if (depth > 3) return;
  const items = fs.readdirSync(dirPath).filter(i => !i.startsWith('.') && i !== 'node_modules');
  items.forEach((item, idx) => {
    const fullPath = path.join(dirPath, item);
    const isDir = fs.statSync(fullPath).isDirectory();
    const isLast = idx === items.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    console.log(prefix + connector + (isDir ? '📁 ' : '') + item);
    if (isDir) {
      showDir(fullPath, prefix + (isLast ? '    ' : '│   '), depth + 1);
    }
  });
}

console.log('\n📊 Bookshelf Library - Final Structure\n');
console.log('📁 Bookshelf_library/');
showDir(ROOT, '│ ', 0);
console.log('\n✅ Structure complete!');