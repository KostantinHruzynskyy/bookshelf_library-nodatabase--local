const fs = require('fs');
const path = require('path');

console.log('🔒 Enhancing security...\n');

// Read current server.js
let server = fs.readFileSync('server.js', 'utf8');

// 1. Add security imports after multer import
const securityImports = `
const { applySecurity } = require('./src/middleware/apply-security');
const { authRequired, adminRequired } = require('./src/middleware/auth-middleware');
const { validatePasswordStrength } = require('./src/middleware/csrf-protection');
`;

server = server.replace(
  "const multer = require(\"multer\");",
  "const multer = require(\"multer\");\n" + securityImports
);

// 2. Add applySecurity before session loader
server = server.replace(
  "/* ---- SESSION LOADER ---- */",
  "/* ---- SECURITY MIDDLEWARE ---- */\napplySecurity(app);\n\n/* ---- SESSION LOADER ---- */"
);

// 3. Update auth routes to use enhanced functions
server = server.replace(
  "const { login, register, logout, me, getUserProfile, getUserBooks } = require(\"./security/register-login\");",
  "const { getUserProfile, getUserBooks } = require(\"./src/services/auth-service\");\nconst { loginUser, registerUser, logoutUser } = require(\"./src/middleware/auth-middleware\");"
);

// 4. Replace login route with enhanced version
const newLoginRoute = `app.post("/api/auth/login", async (req, res) => {
  try {
    const result = await loginUser(req.body.email, req.body.password, req);
    const maxAge = req.body.remember ? 30 * 86400 : 86400;
    res.setHeader('Set-Cookie', \`bookshelf_session=\${result.sessionId}; Path=/; HttpOnly; SameSite=strict; Max-Age=\${maxAge}\`);
    res.json({ ok: true, user: result.user, message: "Login successful!" });
  } catch (e) {
    res.status(e.message.includes("locked") ? 423 : 401).json({ error: "login_failed", message: e.message });
  }
});`;

server = server.replace(
  "app.post(\"/api/auth/login\", login);",
  newLoginRoute
);

// 5. Replace register route
const newRegisterRoute = `app.post("/api/auth/register", async (req, res) => {
  try {
    const user = await registerUser(req.body);
    const { loginUser } = require('./src/middleware/auth-middleware');
    const result = await loginUser(user.email, req.body.password, req);
    res.setHeader('Set-Cookie', \`bookshelf_session=\${result.sessionId}; Path=/; HttpOnly; SameSite=strict; Max-Age=86400\`);
    res.status(201).json({ ok: true, user: result.user, message: "Registration successful!" });
  } catch (e) {
    const status = e.message.includes("required") ? 400 : e.message.includes("exists") ? 409 : e.message.includes("password") ? 400 : 500;
    res.status(status).json({ error: "registration_failed", message: e.message });
  }
});`;

server = server.replace(
  "app.post(\"/api/auth/register\", register);",
  newRegisterRoute
);

// 6. Replace logout route
server = server.replace(
  "app.post(\"/api/auth/logout\", logout);",
  `app.post("/api/auth/logout", async (req, res) => {
    const sid = req.user?.sessionId || req.cookies?.bookshelf_session;
    await logoutUser(sid);
    res.removeHeader('Set-Cookie');
    res.setHeader('Set-Cookie', 'bookshelf_session=deleted; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=strict');
    res.json({ ok: true });
  });`
);

// 7. Update me route
server = server.replace(
  "app.get(\"/api/auth/me\", me);",
  `app.get("/api/auth/me", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "not_logged_in" });
    res.json({ ok: true, user: req.user });
  });`
);

// 8. Add user routes with auth middleware
const newUserRoutes = `/* ---- USER ROUTES ---- */
app.get('/api/user/profile', authRequired, (req, res) => {
  try {
    const profile = getUserProfile(req.user.id);
    res.json({ ok: true, profile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/user/books', authRequired, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const result = getUserBooks(req.user.id, page, limit);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});`;

// Replace existing user routes
server = server.replace(
  /\/\* ---- USER ROUTES ---- \*\/[\s\S]*?app\.get\('\/api\/user\/books'[\s\S]*?\}\);/,
  newUserRoutes
);

// 9. Add health endpoint before app.listen
server = server.replace(
  "app.listen(3000, () => {",
  `/* ---- HEALTH ENDPOINT ---- */
app.get('/api/health', (req, res) => {
  try {
    require("./src/database/connection").getDb().prepare("SELECT 1").get();
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: "error", error: e.message });
  }
});

app.listen(3000, () => {`
);

// 10. Update error message
server = server.replace(
  "console.log(\"Server running on http://localhost:3000\");",
  "console.log(\"Server running on http://localhost:3000\");"
);

// Write updated server.js
fs.writeFileSync('server.js', server);

console.log('✓ Security enhancements applied:');
console.log('  1. Security Headers (XSS, CSRF, Clickjacking)');
console.log('  2. Rate Limiting (100 req/15min, 10 req/15min auth)');
console.log('  3. CSRF Token generation');
console.log('  4. Enhanced session validation');
console.log('  5. Account status checking');
console.log('  6. Improved error handling');
console.log('  7. Password strength validation');
console.log('  8. Login attempt limiting');
console.log('  9. Session expiration');
console.log(' 10. Secure cookie settings');
console.log('\n✅ server.js updated successfully!');