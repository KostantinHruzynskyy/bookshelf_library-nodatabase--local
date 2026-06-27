const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
function ensureDir(p) { if (!fs.existsSync(p)) { fs.mkdirSync(p, { recursive: true }); console.log('✓ Created:', p.replace(ROOT + '/', '')); } }
function copyFile(src, dest) { if (fs.existsSync(src)) { ensureDir(path.dirname(dest)); fs.copyFileSync(src, dest); console.log('✓ Copied:', src.replace(ROOT + '/', '')); } }
function removeFile(f) { if (fs.existsSync(f)) { fs.unlinkSync(f); console.log('✓ Removed:', f.replace(ROOT + '/', '')); } }
console.log('🧹 Final cleanup...\n');
console.log('📁 Creating Time Machine...');
ensureDir('docs/timemachine/fixes');
ensureDir('docs/timemachine/patches');
ensureDir('docs/timemachine/tests');
ensureDir('docs/timemachine/temp-files');
ensureDir('docs/timemachine/backups');
console.log('\n🔧 Archiving fixes...');
['fix_css.js', 'fix_syntax.js', 'fix_server.js', 'fix_login.js', 'reset_admin.js', 'clear_sessions.js'].forEach(f => {
  if (fs.existsSync(f)) { const c = `// Fix: ${f}\n// Data: 2026-06-27\n\n` + fs.readFileSync(f, 'utf8'); fs.writeFileSync(path.join(ROOT, 'docs/timemachine/fixes', f), c); console.log('✓', f); }
});
console.log('\n📦 Archiving patches...');
['add_routes.js', 'add_routes.ps1', 'add_dashboard_css.js', 'add_responsive.js', 'add_responsive_css.js', 'add_user_routes.js', 'update_server.js', 'update_gitignore.js', 'update_index.js'].forEach(f => {
  if (fs.existsSync(f)) { const c = `// Patch: ${f}\n// Data: 2026-06-27\n\n` + fs.readFileSync(f, 'utf8'); fs.writeFileSync(path.join(ROOT, 'docs/timemachine/patches', f), c); console.log('✓', f); }
});
console.log('\n🧪 Archiving tests...');
['test_login.js', 'test_api.js', 'test_dashboard.js', 'test_server.js', 'test_auth.js'].forEach(f => {
  if (fs.existsSync(f)) { const c = `// Test: ${f}\n// Data: 2026-06-27\n\n` + fs.readFileSync(f, 'utf8'); fs.writeFileSync(path.join(ROOT, 'docs/timemachine/tests', f), c); console.log('✓', f); }
});
console.log('\n🗂️ Archiving temp files...');
['add_dashboard_css.js', 'add_user_routes.js', 'update_gitignore.js', 'update_index.js', 'update_server.js', 'reorganize.js', 'show_structure.js'].forEach(f => {
  if (fs.existsSync(f)) { copyFile(f, path.join('docs/timemachine/temp-files', f)); }
});
console.log('\n💾 Backing up originals...');
if (fs.existsSync('server.js.bak')) { copyFile('server.js.bak', 'docs/timemachine/backups/server.js.pre-fix'); }
if (fs.existsSync('server.js')) { copyFile('server.js', 'docs/timemachine/backups/server.js.current'); }
console.log('\n📋 Creating Time Machine index...');
const idx = `# 🕐 Time Machine - Cronologia Modifiche

Cartella contenente la cronologia completa delle modifiche al progetto.

## Struttura
- **fixes/** - Correzioni bug (6 file)
- **patches/** - Funzionalità aggiunte (9 file)
- **tests/** - Test di verifica (5 file)
- **temp-files/** - File temporanei
- **backups/** - Backup file originali

## Timeline
1. **Setup** - Database, autenticazione
2. **Core** - API routes, health check
3. **UI** - Responsive, dashboard
4. **Security** - Password reset, sessions
5. **Reorganize** - Struttura cartelle

*Ogni file include commenti con data e scopo.*
`;
fs.writeFileSync(path.join(ROOT, 'docs/timemachine/INDEX.md'), idx);
console.log('\n📂 Moving remaining files...');
['task_progress.md', 'text.md', 'todo.md', 'PLAN.md', 'admin.md'].forEach(f => { if (fs.existsSync(f)) { copyFile(f, path.join('docs', f)); removeFile(f); } });
if (fs.existsSync('restart_server.bat')) { copyFile('restart_server.bat', 'docs/timemachine/temp-files/restart_server.bat'); removeFile('restart_server.bat'); }
if (fs.existsSync('db-enhanced.js')) { copyFile('db-enhanced.js', 'docs/timemachine/temp-files/db-enhanced.js'); removeFile('db-enhanced.js'); }
['_fix_regex.py', '_fix_server.py', '_fix2.py', '_patch_admin.py', '_patch_api.py', '_patch_appjs.py', '_patch_auth.py', '_patch_delete.py', '_patch_routes.py'].forEach(f => { if (fs.existsSync(f)) { copyFile(f, path.join('docs/timemachine/temp-files', f)); removeFile(f); } });
['test-write.js', 'tmp.txt'].forEach(f => { const s = path.join('security', f); if (fs.existsSync(s)) { copyFile(s, path.join('docs/timemachine/temp-files', f)); removeFile(s); } });
if (fs.existsSync('db')) { const files = fs.readdirSync('db'); files.forEach(f => { const src = path.join('db', f); const dest = path.join('docs/timemachine/temp-files', f); if (fs.statSync(src).isDirectory()) { ensureDir(dest); fs.readdirSync(src).forEach(sub => copyFile(path.join(src, sub), path.join(dest, sub))); } else { copyFile(src, dest); } }); try { fs.rmdirSync('db'); } catch(e) { /* ignore */ } console.log('✓ Moved db/ to Time Machine'); }
removeFile('reorganize.js');
removeFile('show_structure.js');
console.log('\n✅ Cleanup complete!');