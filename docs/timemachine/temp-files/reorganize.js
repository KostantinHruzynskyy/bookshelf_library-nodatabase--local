const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
function ensureDir(p) { if (!fs.existsSync(p)) { fs.mkdirSync(p, { recursive: true }); console.log('✓ Created:', p.replace(ROOT + '/', '')); } }
function moveFile(src, dest) { if (fs.existsSync(src)) { ensureDir(path.dirname(dest)); fs.renameSync(src, dest); console.log('✓ Moved:', src.replace(ROOT + '/', '')); } }
function copyFile(src, dest) { if (fs.existsSync(src)) { ensureDir(path.dirname(dest)); fs.copyFileSync(src, dest); console.log('✓ Copied:', src.replace(ROOT + '/', '')); } }
console.log('🚀 Starting reorganization...\n');
console.log('📁 Creating directories...');
ensureDir('src/config'); ensureDir('src/database'); ensureDir('src/models'); ensureDir('src/repositories');
ensureDir('src/services'); ensureDir('src/controllers'); ensureDir('src/middleware'); ensureDir('src/routes');
ensureDir('src/utils'); ensureDir('src/validators');
ensureDir('public/css'); ensureDir('public/js'); ensureDir('public/pages'); ensureDir('public/images');
ensureDir('scripts'); ensureDir('tests'); ensureDir('docs');
ensureDir('storage/uploads'); ensureDir('storage/books'); ensureDir('storage/backups'); ensureDir('logs');
ensureDir('dev/fixes'); ensureDir('dev/patches'); ensureDir('dev/setup'); ensureDir('dev/tests');
console.log('\n🔐 Moving security files...');
moveFile('security/input-sanitizer.js', 'src/middleware/input-sanitizer.js');
moveFile('security/email-validator.js', 'src/validators/email-validator.js');
moveFile('security/security-headers.js', 'src/middleware/security-headers.js');
moveFile('security/rate-limiter.js', 'src/middleware/rate-limiter.js');
moveFile('security/auth-middleware.js', 'src/middleware/auth-middleware.js');
moveFile('security/auth-required.js', 'src/middleware/auth-required.js');
moveFile('security/register-login.js', 'src/services/auth-service.js');
console.log('\n🗄️ Moving database files...');
moveFile('config/database.js', 'src/config/database.js');
moveFile('db.js', 'src/database/connection.js');
moveFile('src/books.js', 'src/repositories/book-repository.js');
moveFile('src/formatters.js', 'src/utils/formatters.js');
console.log('\n🎨 Moving public assets...');
moveFile('public/style.css', 'public/css/main.css');
moveFile('public/app.js', 'public/js/app.js');
moveFile('public/index.html', 'public/pages/index.html');
moveFile('public/login.html', 'public/pages/login.html');
moveFile('public/register.html', 'public/pages/register.html');
moveFile('public/dashboard.html', 'public/pages/dashboard.html');
moveFile('public/admin.html', 'public/pages/admin.html');
moveFile('public/reader.html', 'public/pages/reader.html');
console.log('\n📜 Moving scripts...');
moveFile('scripts/backup.js', 'scripts/backup.js');
moveFile('scripts/health.js', 'scripts/health-check.js');
console.log('\n🔧 Archiving fixes...');
['fix_css.js', 'fix_syntax.js', 'fix_server.js', 'fix_login.js', 'reset_admin.js', 'clear_sessions.js'].forEach(f => {
  if (fs.existsSync(f)) { copyFile(f, 'dev/fixes/' + f); fs.unlinkSync(f); console.log('✓ Archived:', f); }
});
console.log('\n📦 Archiving patches...');
['add_routes.js', 'add_routes.ps1', 'add_dashboard_css.js', 'add_responsive_css.js', 'add_user_routes.js', 'update_server.js', 'update_gitignore.js', 'update_index.js'].forEach(f => {
  if (fs.existsSync(f)) { copyFile(f, 'dev/patches/' + f); fs.unlinkSync(f); console.log('✓ Archived:', f); }
});
console.log('\n🧪 Archiving tests...');
['test_login.js', 'test_api.js', 'test_dashboard.js', 'test_server.js', 'test_auth.js'].forEach(f => {
  if (fs.existsSync(f)) { copyFile(f, 'dev/tests/' + f); fs.unlinkSync(f); console.log('✓ Archived:', f); }
});
console.log('\n📚 Archiving docs...');
['ADVANCED_SYSTEM.md', 'CHANGES_SUMMARY.md', 'IMPLEMENTATION_COMPLETE.md', 'IMPLEMENTATION_SUMMARY.md', 'QUICKSTART.md', 'README_ADVANCED.md', 'USER_SYSTEM.md'].forEach(f => {
  if (fs.existsSync(f)) { copyFile(f, 'docs/' + f); fs.unlinkSync(f); console.log('✓ Archived:', f); }
});
console.log('\n🗑️ Removing temp files...');
['_fix_regex.py', '_fix_server.py', '_fix2.py', '_patch_admin.py', '_patch_api.py', '_patch_appjs.py', '_patch_auth.py', '_patch_delete.py', '_patch_routes.py'].forEach(f => {
  if (fs.existsSync(f)) { fs.unlinkSync(f); console.log('✓ Removed:', f); }
});
console.log('\n✅ Reorganization complete!');