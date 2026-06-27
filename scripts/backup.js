'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DB_PATH = process.env.DB_PATH || './bookshelf.db';
const BACKUP_DIR = process.env.BACKUP_DIR || './backups';

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(BACKUP_DIR, `bookshelf-${timestamp}.db`);

try {
  console.log(`📦 Starting backup...`);
  console.log(`Source: ${DB_PATH}`);
  console.log(`Destination: ${backupPath}`);

  // Copy database file
  fs.copyFileSync(DB_PATH, backupPath);
  
  // Also backup WAL and SHM files if they exist
  const walPath = `${DB_PATH}-wal`;
  const shmPath = `${DB_PATH}-shm`;
  
  if (fs.existsSync(walPath)) {
    fs.copyFileSync(walPath, `${backupPath}-wal`);
  }
  if (fs.existsSync(shmPath)) {
    fs.copyFileSync(shmPath, `${backupPath}-shm`);
  }

  // Compress backup
  execSync(`gzip -f "${backupPath}"`);
  
  console.log(`✅ Backup completed: ${backupPath}.gz`);
  
  // Clean old backups (keep last 7)
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('bookshelf-') && f.endsWith('.gz'))
    .sort()
    .reverse();
  
  if (files.length > 7) {
    const toDelete = files.slice(7);
    toDelete.forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      console.log(`🗑️ Deleted old backup: ${f}`);
    });
  }
  
  console.log('✅ Backup process completed successfully');
  
} catch (error) {
  console.error('❌ Backup failed:', error.message);
  process.exit(1);
}