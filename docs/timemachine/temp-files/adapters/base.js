'use strict';

/**
 * Base database adapter interface
 * All database adapters must extend this class
 */
class BaseAdapter {
  constructor(config) {
    this.config = config;
    this.connected = false;
  }

  /**
   * Connect to database
   */
  async connect() {
    throw new Error('connect() must be implemented');
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    throw new Error('disconnect() must be implemented');
  }

  /**
   * Initialize database schema
   */
  async initialize() {
    throw new Error('initialize() must be implemented');
  }

  // ========== User Operations ==========
  
  async createUser(userData) {
    throw new Error('createUser() must be implemented');
  }

  async getUserById(id) {
    throw new Error('getUserById() must be implemented');
  }

  async getUserByEmail(email) {
    throw new Error('getUserByEmail() must be implemented');
  }

  async getUserByUsername(username) {
    throw new Error('getUserByUsername() must be implemented');
  }

  async updateUser(id, userData) {
    throw new Error('updateUser() must be implemented');
  }

  async deleteUser(id) {
    throw new Error('deleteUser() must be implemented');
  }

  async getUserCount() {
    throw new Error('getUserCount() must be implemented');
  }

  // ========== Book Operations ==========

  async createBook(bookData) {
    throw new Error('createBook() must be implemented');
  }

  async getBookById(id) {
    throw new Error('getBookById() must be implemented');
  }

  async getBooks(options = {}) {
    throw new Error('getBooks() must be implemented');
  }

  async updateBook(id, bookData) {
    throw new Error('updateBook() must be implemented');
  }

  async deleteBook(id) {
    throw new Error('deleteBook() must be implemented');
  }

  async getBooksByUser(userId, options = {}) {
    throw new Error('getBooksByUser() must be implemented');
  }

  async getBookCount() {
    throw new Error('getBookCount() must be implemented');
  }

  // ========== Session Operations ==========

  async createSession(sessionData) {
    throw new Error('createSession() must be implemented');
  }

  async getSession(sessionId) {
    throw new Error('getSession() must be implemented');
  }

  async updateSession(sessionId, data) {
    throw new Error('updateSession() must be implemented');
  }

  async deleteSession(sessionId) {
    throw new Error('deleteSession() must be implemented');
  }

  async deleteUserSessions(userId) {
    throw new Error('deleteUserSessions() must be implemented');
  }

  // ========== Category Operations ==========

  async getCategories() {
    throw new Error('getCategories() must be implemented');
  }

  async createCategory(categoryData) {
    throw new Error('createCategory() must be implemented');
  }

  // ========== Language Operations ==========

  async getLanguages() {
    throw new Error('getLanguages() must be implemented');
  }

  async createLanguage(langData) {
    throw new Error('createLanguage() must be implemented');
  }

  // ========== Utility ==========

  async healthCheck() {
    throw new Error('healthCheck() must be implemented');
  }

  async backup(path) {
    throw new Error('backup() must be implemented');
  }

  async restore(path) {
    throw new Error('restore() must be implemented');
  }
}

module.exports = BaseAdapter;