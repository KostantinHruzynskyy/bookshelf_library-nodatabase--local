const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(filePath, 'utf8');

// Add health endpoints and admin CRUD before app.listen
const newEndpoints = `
/* ---- HEALTH & METRICS ENDPOINTS ---- */
app.get('/api/health', async (req, res) => {
  try {
    const dbAdapter = require("./db/adapter");
    const db = dbAdapter.getDb();
    const health = await db.healthCheck();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      ...health
    });
  } catch (e) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: e.message
    });
  }
});

app.get('/api/metrics', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: 'Admin access required' });
  }
  
  try {
    const db = require("./db/adapter").getDb();
    
    const metrics = {
      totalBooks: await db.getBookCount(),
      totalUsers: await db.getUserCount(),
      activeSessions: db.getConnection().prepare('SELECT COUNT(*) as count FROM sessions WHERE is_active = 1').get().count,
      timestamp: new Date().toISOString()
    };
    
    res.json({ ok: true, metrics });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---- ADVANCED USER CRUD (Admin) ---- */
app.get('/api/admin/users', authRequired, adminRequired, async (req, res) => {
  try {
    const db = require("./db/adapter").getDb();
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    
    const users = db.getConnection().prepare('SELECT id, username, email, role, is_active, last_login_at, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    const total = db.getConnection().prepare('SELECT COUNT(*) as count FROM users').get().count;
    
    res.json({ ok: true, users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/users/:id/role', authRequired, adminRequired, async (req, res) => {
  try {
    const db = require("./db/adapter").getDb();
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['user', 'admin', 'moderator'].includes(role)) {
      return res.status(400).json({ error: 'invalid_role', message: 'Invalid role specified' });
    }
    
    await db.updateUser(id, { role });
    res.json({ ok: true, message: 'User role updated' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/users/:id/status', authRequired, adminRequired, async (req, res) => {
  try {
    const db = require("./db/adapter").getDb();
    const { id } = req.params;
    const { is_active } = req.body;
    
    await db.updateUser(id, { is_active: is_active ? 1 : 0 });
    res.json({ ok: true, message: 'User ' + (is_active ? 'activated' : 'deactivated') });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/users/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const db = require("./db/adapter").getDb();
    const { id } = req.params;
    
    if (id == req.user.id) {
      return res.status(400).json({ error: 'cannot_delete_self', message: 'Cannot delete your own account' });
    }
    
    await db.deleteUser(id);
    await db.logAudit({ user_id: req.user.id, action: 'delete_user', entity_type: 'user', entity_id: parseInt(id), ip_address: req.ip, user_agent: req.get('user-agent') });
    
    res.json({ ok: true, message: 'User deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

`;

content = content.replace("app.listen(3000", newEndpoints + "app.listen(3000");

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ server.js updated with health endpoints and admin CRUD!');