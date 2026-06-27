'use strict';

const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { validateEmailFormat, isDomainAllowed } = require('./email-validator');
const { sanitizeText } = require('./input-sanitizer');

// Helper to generate session ID
function generateSessionId() {
  return Buffer.from(Date.now().toString() + '.' + Math.random().toString(36).slice(2) + '.' + process.hrtime.bigint().toString()).toString('base64').slice(0, 64).replace(/[^a-zA-Z0-9]/g, '');
}

// Helper to ensure sessions table exists
function ensureSessionsTable(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, 
    user_id INTEGER REFERENCES users(id), 
    ip_address TEXT, 
    user_agent TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    expires_at DATETIME, 
    is_active INTEGER DEFAULT 1, 
    data TEXT
  )`);
}

// Helper to get user's book count
function getUserBookCount(db, userId) {
  const result = db.prepare('SELECT COUNT(*) as count FROM books WHERE uploaded_by = ?').get(userId);
  return result ? result.count : 0;
}

function login(req, res) {
  const { email, password, remember } = req.body;
  
  // Validate input
  if (!email || !password) {
    return res.status(400).json({ 
      error: 'missing_fields', 
      message: 'Email and password are required.' 
    });
  }
  
  // Sanitize and validate email
  const cleanEmail = sanitizeText(email.toLowerCase().trim(), 255);
  const emailValidation = validateEmailFormat(cleanEmail);
  if (!emailValidation.startsWith('ok')) {
    return res.status(400).json({ 
      error: 'invalid_email', 
      message: 'Please enter a valid email address.' 
    });
  }

  const db = getDb();
  ensureSessionsTable(db);
  
  // Find user by email
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
  if (!user) {
    return res.status(401).json({ 
      error: 'invalid_credentials', 
      message: 'Invalid email or password. Please try again.' 
    });
  }
  
  // Check if account is active
  if (user.is_active === 0) {
    return res.status(403).json({ 
      error: 'account_disabled', 
      message: 'Your account has been disabled. Please contact support.' 
    });
  }
  
  // Check if account is locked
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    return res.status(423).json({ 
      error: 'account_locked', 
      message: `Account is locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).` 
    });
  }

  // Verify password
  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    const attempts = (user.failed_login_attempts || 0) + 1;
    const remainingAttempts = 5 - attempts;
    
    if (attempts >= 5) {
      const lockedUntil = new Date(Date.now() + 30*60000).toISOString();
      db.prepare('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?').run(attempts, lockedUntil, user.id);
      return res.status(423).json({ 
        error: 'account_locked', 
        message: 'Too many failed attempts. Account locked for 30 minutes.' 
      });
    }
    
    db.prepare('UPDATE users SET failed_login_attempts = ? WHERE id = ?').run(attempts, user.id);
    return res.status(401).json({ 
      error: 'invalid_credentials', 
      message: `Invalid email or password. ${remainingAttempts} attempt(s) remaining.` 
    });
  }

  // Successful login - reset failed attempts
  db.prepare("UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = datetime('now') WHERE id = ?").run(user.id);

  // Create session
  const sessionId = generateSessionId();
  const sessionDuration = remember ? 30 * 86400000 : 86400000; // 30 days or 1 day
  const expiresAt = new Date(Date.now() + sessionDuration).toISOString();
  
  db.prepare('INSERT OR REPLACE INTO sessions (id, user_id, ip_address, user_agent, expires_at, is_active) VALUES (?, ?, ?, ?, ?, 1)')
    .run(sessionId, user.id, req.ip, req.get('user-agent'), expiresAt);

  // Set session cookie
  const maxAge = Math.floor(sessionDuration / 1000);
  res.removeHeader('Set-Cookie');
  res.setHeader('Set-Cookie', `bookshelf_session=${sessionId}; Path=/; HttpOnly; SameSite=strict; Max-Age=${maxAge}`);

  // Prepare safe user object (without password)
  const { password_hash: _, ...safeUser } = user;
  const bookCount = getUserBookCount(db, user.id);
  
  return res.json({ 
    ok: true, 
    user: { 
      ...safeUser, 
      sessionId,
      bookCount 
    },
    message: 'Login successful!'
  });
}

async function register(req, res) {
  const { username, email, password, preferred_language = 'en' } = req.body;
  
  // Validate required fields
  if (!username || !email || !password) {
    return res.status(400).json({ 
      error: 'missing_fields', 
      message: 'All fields are required. Please fill in username, email, and password.' 
    });
  }
  
  // Sanitize inputs
  const cleanUsername = sanitizeText(username.trim(), 30);
  const cleanEmail = sanitizeText(email.toLowerCase().trim(), 255);
  
  // Validate username
  if (cleanUsername.length < 3) {
    return res.status(400).json({ 
      error: 'invalid_username', 
      message: 'Username must be at least 3 characters long.' 
    });
  }
  
  if (cleanUsername.length > 30) {
    return res.status(400).json({ 
      error: 'invalid_username', 
      message: 'Username must be 30 characters or less.' 
    });
  }
  
  // Username can only contain letters, numbers, underscores, and hyphens
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
    return res.status(400).json({ 
      error: 'invalid_username', 
      message: 'Username can only contain letters, numbers, underscores, and hyphens.' 
    });
  }
  
  // Validate email format
  const emailValidation = validateEmailFormat(cleanEmail);
  if (!emailValidation.startsWith('ok')) {
    return res.status(400).json({ 
      error: 'invalid_email', 
      message: 'Please enter a valid email address.' 
    });
  }

  // Check if email domain is allowed
  const domainCheck = await isDomainAllowed(cleanEmail);
  if (!domainCheck.allowed) {
    return res.status(400).json({ 
      error: 'domain_not_allowed', 
      message: 'Please use a valid email provider (gmail.com, yahoo.com, outlook.com, etc.)' 
    });
  }

  const db = getDb();
  ensureSessionsTable(db);
  
  // Check if user already exists
  const existingUser = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(cleanEmail, cleanUsername);
  if (existingUser) {
    if (existingUser.email === cleanEmail) {
      return res.status(409).json({ 
        error: 'email_taken', 
        message: 'An account with this email already exists. Please log in or use a different email.' 
      });
    } else {
      return res.status(409).json({ 
        error: 'username_taken', 
        message: 'This username is already taken. Please choose a different username.' 
      });
    }
  }

  // Validate password strength
  if (password.length < 8) {
    return res.status(400).json({ 
      error: 'weak_password', 
      message: 'Password must be at least 8 characters long.' 
    });
  }
  
  // Check password strength (optional but recommended)
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const strengthScore = hasUpperCase + hasLowerCase + hasNumbers + hasSpecialChar;
  if (strengthScore < 2) {
    return res.status(400).json({ 
      error: 'weak_password', 
      message: 'Password is too weak. Include uppercase, lowercase, numbers, or special characters.' 
    });
  }

  // Hash password and create user
  const hash = bcrypt.hashSync(password, 12);
  
  try {
    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash, preferred_language) VALUES (?, ?, ?, ?)'
    ).run(cleanUsername, cleanEmail, hash, preferred_language);
    
    const userId = result.lastInsertRowid;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    // Create session for auto-login after registration
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 86400000).toISOString(); // 1 day
    
    db.prepare('INSERT OR REPLACE INTO sessions (id, user_id, ip_address, user_agent, expires_at, is_active) VALUES (?, ?, ?, ?, ?, 1)')
      .run(sessionId, userId, req.ip, req.get('user-agent'), expiresAt);

    // Set session cookie
    res.removeHeader('Set-Cookie');
    res.setHeader('Set-Cookie', `bookshelf_session=${sessionId}; Path=/; HttpOnly; SameSite=strict; Max-Age=86400`);

    // Prepare safe user object
    const { password_hash: _, ...safeUser } = user;
    
    return res.status(201).json({ 
      ok: true, 
      user: { 
        ...safeUser, 
        sessionId,
        bookCount: 0 
      },
      message: 'Registration successful! Welcome to Bookshelf Library!'
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      error: 'registration_failed', 
      message: 'An error occurred during registration. Please try again.' 
    });
  }
}

function logout(req, res) {
  // Get session ID from cookie since req.user might not be set for manual logout
  const cookies = (req.headers.cookie || "").split(";");
  let sid = null;
  for (const c of cookies) {
    const [k, ...v] = c.trim().split("=");
    if (k === "bookshelf_session") { sid = v.join("="); break; }
  }
  
  // Also check req.user
  if (!sid && req.user?.sessionId) {
    sid = req.user.sessionId;
  }
  
  if (sid) {
    try {
      const db = getDb();
      db.prepare('UPDATE sessions SET is_active = 0 WHERE id = ?').run(sid);
    } catch (e) { 
      console.error('Logout error:', e);
    }
  }
  
  res.removeHeader('Set-Cookie');
  res.setHeader('Set-Cookie', 'bookshelf_session=deleted; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=strict');
  return res.json({ ok: true, message: 'Logged out successfully.' });
}

function me(req, res) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'not_logged_in',
      message: 'You are not logged in.' 
    });
  }
  
  const db = getDb();
  const { password_hash: _, ...safeUser } = req.user;
  const bookCount = getUserBookCount(db, req.user.id);
  
  return res.json({ 
    ok: true, 
    user: {
      ...safeUser,
      bookCount
    }
  });
}

// Additional utility functions for user management
function getUserProfile(userId) {
  const db = getDb();
  const user = db.prepare('SELECT id, username, email, role, preferred_language, created_at, last_login_at FROM users WHERE id = ?').get(userId);
  if (!user) return null;
  
  const bookCount = getUserBookCount(db, userId);
  const recentBooks = db.prepare(`
    SELECT id, title, created_at 
    FROM books 
    WHERE uploaded_by = ? 
    ORDER BY created_at DESC 
    LIMIT 5
  `).all(userId);
  
  return {
    ...user,
    bookCount,
    recentBooks
  };
}

function getUserBooks(userId, page = 1, limit = 10) {
  const db = getDb();
  const offset = (page - 1) * limit;
  
  const books = db.prepare(`
    SELECT b.*, GROUP_CONCAT(ba.author_name, ', ') as authors
    FROM books b
    LEFT JOIN book_authors ba ON b.id = ba.book_id
    WHERE b.uploaded_by = ?
    GROUP BY b.id
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset);
  
  const total = db.prepare('SELECT COUNT(*) as count FROM books WHERE uploaded_by = ?').get(userId).count;
  
  return {
    books,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

module.exports = { login, register, logout, me, getUserProfile, getUserBooks };
