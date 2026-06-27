'use strict';

const config = require('../config/database');
const SQLiteAdapter = require('./adapters/sqlite');
const PostgreSQLAdapter = require('./adapters/postgresql');
const MySQLAdapter = require('./adapters/mysql');

class DatabaseFactory {
  /**
   * Create database adapter based on configuration
   */
  static create() {
    switch (config.type) {
      case 'sqlite':
        return new SQLiteAdapter(config.sqlite);
      
      case 'postgresql':
      case 'postgres':
        return new PostgreSQLAdapter(config.postgresql);
      
      case 'mysql':
      case 'mariadb':
        return new MySQLAdapter(config.mysql);
      
      default:
        console.warn(`Unknown database type: ${config.type}, falling back to SQLite`);
        return new SQLiteAdapter(config.sqlite);
    }
  }
}

module.exports = DatabaseFactory;