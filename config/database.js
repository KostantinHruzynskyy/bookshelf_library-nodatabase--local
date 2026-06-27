'use strict';

require('dotenv').config();

const config = {
  // Database type: 'sqlite', 'postgresql', 'mysql'
  type: process.env.DB_TYPE || 'sqlite',
  
  // SQLite configuration
  sqlite: {
    path: process.env.DB_PATH || './bookshelf.db',
  },
  
  // PostgreSQL configuration
  postgresql: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'bookshelf',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: parseInt(process.env.DB_POOL_MAX) || 20,
    ssl: process.env.DB_SSL === 'true',
  },
  
  // MySQL configuration
  mysql: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'bookshelf',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: parseInt(process.env.DB_POOL_MAX) || 20,
  },
};

module.exports = config;