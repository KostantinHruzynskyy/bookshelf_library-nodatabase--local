const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Replace auth routes line to include new functions
content = content.replace(
  'const { login, register, logout, me } = require("./security/register-login");',
  'const { login, register, logout, me, getUserProfile, getUserBooks } = require("./security/register-login");'
);

// Add user routes before app.listen
const userRoutes = `
/* ---- USER ROUTES ---- */
app.get('/api/user/profile', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  try {
    const profile = getUserProfile(req.user.id);
    res.json({ ok: true, profile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/user/books', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const result = getUserBooks(req.user.id, page, limit);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---- HEALTH ---- */
app.get('/api/health', (req, res) => {
  try {
    require("./db").getDb().prepare("SELECT 1").get();
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(503).json({ status: 'error' });
  }
});

`;

content = content.replace(
  "app.listen(3000, () => {",
  userRoutes + "app.listen(3000, () => {"
);

fs.writeFileSync(serverPath, content, 'utf8');
console.log('✅ User routes added to server.js!');