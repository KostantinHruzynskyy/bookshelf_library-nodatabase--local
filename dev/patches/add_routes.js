const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(filePath, 'utf8');

// Update the import line
const oldText = 'const { login, register, logout, me } = require("./security/register-login");';
const newText = 'const { login, register, logout, me, getUserProfile, getUserBooks } = require("./security/register-login");';
content = content.replace(oldText, newText);

// Add new routes before app.listen
const routes = `
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

`;

content = content.replace('app.listen(3000', routes + 'app.listen(3000');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Routes added successfully!');