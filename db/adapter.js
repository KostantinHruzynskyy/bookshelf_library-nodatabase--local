'use strict';

const DatabaseFactory = require('./factory');

let dbInstance = null;

/**
 * Get database adapter instance (singleton)
 */
function getDb() {
  if (!dbInstance) {
    dbInstance = DatabaseFactory.create();
  }
  return dbInstance;
}

/**
 * Close database connection
 */
async function closeDb() {
  if (dbInstance && dbInstance.close) {
    await dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Initialize database (create tables, seed data)
 */
async function initDb() {
  const db = getDb();
  await db.initialize();
  return db;
}

module.exports = {
  getDb,
  closeDb,
  initDb,
};