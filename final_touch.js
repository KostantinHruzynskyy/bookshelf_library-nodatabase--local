const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

console.log('🎯 Final touch - Completing cataloging...\n');

// 1. Sposta file rimasti in dev/temp-files
const filesToArchive = [
  'enhance_security.js',
  'final_cleanup.js',
  'list_files.js',
  'show_structure.js'
];

filesToArchive.forEach(f => {
  if (fs.existsSync(f)) {
    fs.copyFileSync(f, path.join('dev/scripts', f));
    fs.unlinkSync(f);
    console.log('✓ Archived:', f);
  }
});

// 2. Sposta file vari nella root
const filesToDocs = ['i18n.js', 'i18n-ruby-python.js', 'books.json'];
filesToDocs.forEach(f => {
  if (fs.existsSync(f)) {
    fs.copyFileSync(f, path.join('docs/timemachine/temp-files', f));
    fs.unlinkSync(f);
    console.log('✓ Moved to docs:', f);
  }
});

// 3. Aggiorna README con info sicurezza
console.log('\n📝 Updating README with security info...');
let readme = fs.readFileSync('README.md', 'utf8');

const securitySection = `## 🔒 Sicurezza Avanzata

Il sistema implementa protezioni di livello enterprise:

### Protezioni Implementate
- ✅ **CSRF Protection** - Token per ogni sessione
- ✅ **XSS Protection** - Headers e sanitizzazione input
- ✅ **SQL Injection** - Prepared statements
- ✅ **Rate Limiting** - 100 req/15min (10 per auth)
- ✅ **Brute Force Protection** - Lockout dopo 5 tentativi
- ✅ **Session Security** - HttpOnly, SameSite, Secure flags
- ✅ **Password Hashing** - bcrypt con costo 12
- ✅ **Input Validation** - Server-side completa
- ✅ **Security Headers** - X-Frame, X-Content-Type, etc.
- ✅ **Audit Logging** - Tracciamento azioni

### Best Practice
- Password minimo 8 caratteri con maiuscole, numeri e simboli
- Sessioni con scadenza automatica
- Rigenerazione sessione dopo login
- Validazione lato server di tutti gli input

## 🔧 Manutenzione

### Backup
\`\`\`bash
node scripts/backup.js
\`\`\`

### Health Check
\`\`\`bash
node scripts/health-check.js
\`\`\`

## 📝 Time Machine

\`docs/timemachine/\` contiene:
- \`fixes/\` - 6 bug fix documentati
- \`patches/\` - 9 feature patches
- \`tests/\` - 5 test di verifica
- \`backups/\` - Backup originali`;

// Insert security section before the existing security section
readme = readme.replace(
  '## 🔒 Sicurezza',
  securitySection + '\n\n## 🔒 Sicurezza (Legacy)'
);

fs.writeFileSync('README.md', readme);
console.log('✓ README updated');

// 4. Crea file .env se non esiste
if (!fs.existsSync('.env')) {
  const envContent = `# Server
NODE_ENV=development
PORT=3000

# Database
DB_TYPE=sqlite
DB_PATH=./bookshelf.db

# Security
SESSION_SECRET=change-me-to-random-64-chars
JWT_SECRET=change-me-to-random-64-chars
BCRYPT_ROUNDS=12

# Upload
MAX_FILE_SIZE=52428800
`;
  fs.writeFileSync('.env.example', envContent);
  console.log('✓ Created .env.example');
}

console.log('\n✅ Final touch complete!');
console.log('\n📊 Project structure:');
console.log('  📁 src/          - Production code with security');
console.log('  📁 public/       - Static assets');
console.log('  📁 dev/          - Development & fixes');
console.log('  📁 docs/         - Documentation & Time Machine');
console.log('  📁 scripts/      - DevOps scripts');
console.log('  📁 storage/      - Local storage');
console.log('  📄 server.js     - Entry point with enhanced security');
console.log('  📄 README.md     - Complete documentation');