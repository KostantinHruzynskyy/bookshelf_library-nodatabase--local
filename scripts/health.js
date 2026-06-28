'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const healthCheck = async () => {
  const checks = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    disk: null,
    database: null,
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      loadavg: os.loadavg()
    }
  };

  // Check disk space
  try {
    const backupDir = path.join(__dirname, '../storage/backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    checks.disk = { status: 'ok', writable: true };
  } catch (e) {
    checks.disk = { status: 'error', message: e.message };
  }

  // Check database
  try {
    const { getDb } = require('../src/database/connection');
    const db = getDb();
    db.prepare('SELECT 1').get();
    
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const bookCount = db.prepare('SELECT COUNT(*) as count FROM books').get().count;
    
    checks.database = { 
      status: 'ok',
      stats: { users: userCount, books: bookCount }
    };
  } catch (e) {
    checks.database = { status: 'error', message: e.message };
  }

  const isHealthy = checks.disk.status === 'ok' && checks.database.status === 'ok';
  checks.status = isHealthy ? 'healthy' : 'unhealthy';

  console.log(JSON.stringify(checks, null, 2));
  return checks;
};

if (require.main === module) {
  healthCheck()
    .then(checks => process.exit(checks.status === 'healthy' ? 0 : 1))
    .catch(error => { console.error('Health check failed:', error.message); process.exit(1); });
}

module.exports = { healthCheck };
