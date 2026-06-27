const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// Create necessary directories
const dirs = [
  'src/controllers',
  'src/routes',
  'src/models',
  'tests/unit',
  'tests/integration',
  'tests/fixtures',
  'docs/api',
  '.github/workflows',
  'storage/verification',
  'storage/reset-tokens'
];

dirs.forEach(dir => {
  const fullPath = path.join(ROOT, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✓ Created: ${dir}`);
  }
});

console.log('\n✅ Directories created!');