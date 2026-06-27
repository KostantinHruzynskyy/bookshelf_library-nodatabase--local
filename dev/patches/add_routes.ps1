$filePath = 'c:\Users\Utente\skyprogetti\progettosito\Bookshelf_library\server.js';
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8);

# Update the import line
$oldText = 'const { login, register, logout, me } = require("./security/register-login");';
$newText = 'const { login, register, logout, me, getUserProfile, getUserBooks } = require("./security/register-login");';
$content = $content.Replace($oldText, $newText);

# Add new routes before app.listen
$routes = @"

/* ---- USER PROTECTED ROUTES ---- */
// Get user profile (requires login)
app.get('/api/user/profile', authRequired, (req, res) => {
  try {
    const profile = getUserProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'user_not_found', message: 'User not found.' });
    }
    res.json({ ok: true, profile });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error', message: 'An error occurred.' });
  }
});

// Get user's uploaded books (requires login)
app.get('/api/user/books', authRequired, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const result = getUserBooks(req.user.id, page, limit);
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error', message: 'An error occurred.' });
  }
});

"@;

$content = $content.Replace("app.listen(3000", $routes + "app.listen(3000");

[System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8);
Write-Host "Routes added successfully!";