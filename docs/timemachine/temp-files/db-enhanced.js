'use strict';

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

const DB_ENHANCED_PATH = path.join(__dirname, 'bookshelf-secure.db');
let dbEnhanced;

function getDbEnhanced() {
  if (!dbEnhanced) {
    dbEnhanced = new Database(DB_ENHANCED_PATH);
    dbEnhanced.pragma('journal_mode = WAL');
    dbEnhanced.pragma('foreign_keys = ON');
    dbEnhanced.pragma('synchronous = NORMAL');
    dbEnhanced.pragma('cache_size = -64000');
    dbEnhanced.pragma('temp_store = MEMORY');
    initEnhancedSchema(dbEnhanced);
  }
  return dbEnhanced;
}

function initEnhancedSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('user','admin','moderator')),
      preferred_language TEXT DEFAULT 'en',
      is_active INTEGER DEFAULT 1 CHECK(is_active IN (0,1)),
      is_email_verified INTEGER DEFAULT 0 CHECK(is_email_verified IN (0,1)),
      last_login_at DATETIME,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      language TEXT DEFAULT 'en',
      category_id INTEGER,
      year INTEGER,
      isbn TEXT,
      pages INTEGER,
      publisher TEXT,
      cover_image TEXT,
      file_path TEXT NOT NULL,
      file_format TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      uploaded_by INTEGER,
      is_recommended INTEGER DEFAULT 0,
      is_public_domain INTEGER DEFAULT 0,
      downloads INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_key TEXT UNIQUE NOT NULL,
      icon TEXT DEFAULT '📚',
      parent_id INTEGER REFERENCES categories(id),
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS languages (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      native_name TEXT NOT NULL,
      icon TEXT DEFAULT '🌐',
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      identifier_type TEXT NOT NULL CHECK(identifier_type IN ('email','ip')),
      attempt_type TEXT DEFAULT 'login',
      success INTEGER DEFAULT 0,
      ip_address TEXT,
      user_agent TEXT,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts(identifier, attempted_at);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      is_active INTEGER DEFAULT 1 CHECK(is_active IN (0,1)),
      data TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active, expires_at);

    CREATE TABLE IF NOT EXISTS security_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      severity TEXT DEFAULT 'info' CHECK(severity IN ('info','warning','critical','success','error')),
      user_id INTEGER,
      session_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      description TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_audit_event_type ON security_audit_log(event_type);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON security_audit_log(created_at);

    CREATE TABLE IF NOT EXISTS allowed_email_domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT UNIQUE NOT NULL,
      category TEXT DEFAULT 'popular',
      is_active INTEGER DEFAULT 1,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS security_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_source TEXT NOT NULL,
      severity TEXT DEFAULT 'warning' CHECK(severity IN ('info','warning','critical','blocked')),
      ip_address TEXT,
      endpoint TEXT,
      details TEXT,
      blocked INTEGER DEFAULT 0 CHECK(blocked IN (0,1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS file_scan_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER,
      scan_type TEXT DEFAULT 'mime_validation',
      result TEXT NOT NULL CHECK(result IN ('clean','suspicious','blocked','warning')),
      details TEXT,
      scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
