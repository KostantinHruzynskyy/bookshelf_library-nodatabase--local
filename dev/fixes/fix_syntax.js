const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Find and fix the broken section after health endpoint
const brokenSection = `});

  }
  
  try {
    const db = getDb();
    
    const metrics = {
      totalBooks: db.getBookCount(),
      totalUsers: db.getUserCount(),
      activeSessions: db.prepare('SELECT COUNT(*) as count FROM sessions WHERE is_active = 1').get().count,
      timestamp: new Date().toISOString()
    };
    
    res.json({ ok: true, metrics });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});`;

const fixedSection = `});

/* ---- METRICS ENDPOINT ---- */
app.get('/api/metrics', authRequired, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: 'Admin access required' });
  }
  try {
    const db = getDb();
    const metrics = {
      totalBooks: db.prepare('SELECT COUNT(*) as count FROM books').get().count,
      totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      activeSessions: db.prepare('SELECT COUNT(*) as count FROM sessions WHERE is_active = 1').get().count,
      timestamp: new Date().toISOString()
    };
    res.json({ ok: true, metrics });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});`;

content = content.replace(brokenSection, fixedSection);

// Write the fixed content
fs.writeFileSync(serverPath, content, 'utf8');
console.log('✅ Syntax fixed!');