const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Replace all instances of require("./db/adapter") with require("./db")
content = content.replace(/require\("\.\/db\/adapter"\)/g, 'require("./db")');

// Also fix any getDb() calls that might be wrong
content = content.replace(/dbAdapter\.getDb\(\)/g, 'getDb()');

// Remove the duplicate health endpoint that uses db adapter
const healthEndpoint = /\n\/\* ---- HEALTH & METRICS ENDPOINTS ---- \*\/[\s\S]*?app\.get\('\/api\/metrics'[\s\S]*?\}\);/;
content = content.replace(healthEndpoint, '\n/* ---- HEALTH ENDPOINT ---- */\napp.get("/api/health", async (req, res) => {\n  try {\n    getDb().prepare("SELECT 1").get();\n    res.json({ status: "ok", timestamp: new Date().toISOString() });\n  } catch (e) {\n    res.status(503).json({ status: "error", error: e.message });\n  }\n});');

// Fix the admin routes to use the correct db interface
content = content.replace(
  /const db = require\("\.\/db"\)\.getDb\(\);/g,
  'const db = getDb();'
);

// Remove getConnection() calls - use db directly
content = content.replace(
  /db\.getConnection\(\)\.prepare/g,
  'db.prepare'
);

// Remove async/await from routes that don't need it (db.js is sync)
content = content.replace(
  /app\.get\('\/api\/user\/profile', authRequired, async \(req, res\) =>/g,
  "app.get('/api/user/profile', authRequired, (req, res) =>"
);

content = content.replace(
  /app\.get\('\/api\/user\/books', authRequired, async \(req, res\) =>/g,
  "app.get('/api/user/books', authRequired, (req, res) =>"
);

content = content.replace(
  /app\.get\('\/api\/metrics', authRequired, async \(req, res\) =>/g,
  "app.get('/api/metrics', authRequired, (req, res) =>"
);

content = content.replace(
  /app\.get\('\/api\/admin\/users', authRequired, adminRequired, async \(req, res\) =>/g,
  "app.get('/api/admin/users', authRequired, adminRequired, (req, res) =>"
);

content = content.replace(
  /app\.put\('\/api\/admin\/users\/:id\/role', authRequired, adminRequired, async \(req, res\) =>/g,
  "app.put('/api/admin/users/:id/role', authRequired, adminRequired, (req, res) =>"
);

content = content.replace(
  /app\.put\('\/api\/admin\/users\/:id\/status', authRequired, adminRequired, async \(req, res\) =>/g,
  "app.put('/api/admin/users/:id/status', authRequired, adminRequired, (req, res) =>"
);

content = content.replace(
  /app\.delete\('\/api\/admin\/users\/:id', authRequired, adminRequired, async \(req, res\) =>/g,
  "app.delete('/api/admin/users/:id', authRequired, adminRequired, (req, res) =>"
);

// Remove await from db calls (db.js is synchronous)
content = content.replace(/await db\./g, 'db.');
content = content.replace(/await getDb\(\)/g, 'getDb()');

// Fix the logAudit call
content = content.replace(
  /await db\.logAudit\(\{ user_id: req\.user\.id, action: 'delete_user', entity_type: 'user', entity_id: parseInt\(id\), ip_address: req\.ip, user_agent: req\.get\('user-agent'\) \}\);/g,
  "db.prepare('INSERT INTO audit_log (user_id, action, entity_type, entity_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)').run(req.user.id, 'delete_user', 'user', parseInt(id), req.ip, req.get('user-agent'));"
);

fs.writeFileSync(serverPath, content, 'utf8');
console.log('✅ server.js fixed!');