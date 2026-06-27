import pathlib

p = pathlib.Path('public/app.js')
c = p.read_text(encoding='utf-8')

old = '/* UTILITY */\nfunction escapeHtml(str) {\n  const div = document.createElement("div");\n  div.textContent = str || "";\n  return div.innerHTML;\n}'

new_code = """/* AUTH UI */
function updateAuthUI() {
  fetch('/api/auth/me')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && data.ok) {
        document.getElementById('authLinks').style.display = 'none';
        document.getElementById('userLinks').style.display = 'inline-flex';
        document.getElementById('userName').textContent = '\U0001f444 ' + data.user.username;
      } else {
        document.getElementById('authLinks').style.display = 'inline-flex';
        document.getElementById('userLinks').style.display = 'none';
      }
    })
    .catch(function() {});
}
var logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) logoutBtn.addEventListener('click', function(e) {
  e.preventDefault();
  fetch('/api/auth/logout', { method: 'POST' }).then(function() { window.location.reload(); });
});
updateAuthUI();

/* UTILITY */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}"""

if old in c:
    c = c.replace(old, new_code, 1)
    p.write_text(c, encoding='utf-8')
    print('patched app.js successfully')
else:
    print('old text not found')
