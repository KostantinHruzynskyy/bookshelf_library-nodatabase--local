import pathlib

p = pathlib.Path('public/admin.html')
c = p.read_text(encoding='utf-8')

# Add auth check before loadBooks()
old = '/* ---- INIT ---- */\nloadBooks();'
new_code = '''/* ---- AUTH CHECK ---- */
function checkAuth() {
  fetch('/api/auth/me')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && data.ok) {
        var userEl = document.getElementById('userInfo');
        if (userEl) { userEl.textContent = 'Logged in as: ' + data.user.username; userEl.style.display = 'inline-block'; }
      } else {
        document.getElementById('loginPrompt').style.display = 'block';
        document.getElementById('adminContent').style.display = 'none';
      }
    })
    .catch(function() {
      document.getElementById('loginPrompt').style.display = 'block';
      document.getElementById('adminContent').style.display = 'none';
    });
}

/* ---- INIT ---- */
checkAuth();
loadBooks();'''

if old in c:
    c = c.replace(old, new_code, 1)
    p.write_text(c, encoding='utf-8')
    print('patched admin.html - auth check added')
else:
    print('old text not found')
