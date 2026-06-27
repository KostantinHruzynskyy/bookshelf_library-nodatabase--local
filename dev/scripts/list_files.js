const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

console.log('\n📊 Bookshelf Library - Root Directory Files:\n');
const files = fs.readdirSync(ROOT).filter(f => {
  const fp = path.join(ROOT, f);
  return fs.statSync(fp).isFile();
}).sort();

files.forEach(f => console.log('  ', f));

console.log('\n✅ Done');