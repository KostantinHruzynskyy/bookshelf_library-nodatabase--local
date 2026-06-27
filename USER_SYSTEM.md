# Bookshelf Library - User Registration & Login System

## Overview
This document describes the complete user authentication and authorization system for the Bookshelf Library application.

## Features

### 1. User Registration
- **Location**: `/register.html`
- **API Endpoint**: `POST /api/auth/register`
- **Features**:
  - Username validation (3-30 characters, alphanumeric + underscore + hyphen)
  - Email validation with domain checking
  - Password strength requirements (8+ characters, must include 2 of: uppercase, lowercase, numbers, special chars)
  - Automatic login after registration
  - Duplicate email/username detection

### 2. User Login
- **Location**: `/login.html`
- **API Endpoint**: `POST /api/auth/login`
- **Features**:
  - Email and password authentication
  - "Remember me" option (30-day session vs 1-day)
  - Brute force protection (5 attempts, 30-minute lockout)
  - Session management with secure cookies
  - Failed attempt tracking

### 3. User Dashboard
- **Location**: `/dashboard.html`
- **Access**: Registered users only (redirects to login if not authenticated)
- **Features**:
  - Profile information display
  - Upload statistics (total books, join date, account type)
  - List of user's uploaded books
  - Quick link to upload new books

### 4. Session Management
- **Cookie Name**: `bookshelf_session`
- **Security**:
  - HttpOnly flag (prevents XSS)
  - SameSite=strict (prevents CSRF)
  - Secure flag in production
  - 24-hour default expiration (30 days with "remember me")

### 5. Protected Routes
The following actions require authentication:
- Upload books (`POST /api/books/upload`)
- Edit books (`PUT /api/books/:id`)
- Delete books (`DELETE /api/books/:id`)
- View user profile (`GET /api/user/profile`)
- View user's books (`GET /api/user/books`)

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK(role IN ('user','admin','moderator')),
  preferred_language TEXT DEFAULT 'en',
  is_active INTEGER DEFAULT 1,
  is_email_verified INTEGER DEFAULT 0,
  last_login_at DATETIME,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  is_active INTEGER DEFAULT 1,
  data TEXT
);
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

### User Management (Protected)
- `GET /api/user/profile` - Get user profile
- `GET /api/user/books` - Get user's uploaded books (with pagination)

## Security Features

1. **Password Hashing**: bcrypt with 12 salt rounds
2. **Brute Force Protection**: Account lockout after 5 failed attempts
3. **Session Security**: HttpOnly, SameSite, and Secure cookie flags
4. **Input Sanitization**: All user inputs are sanitized
5. **Rate Limiting**: 10 auth requests per 15 minutes
6. **Email Domain Validation**: Only allowed email providers

## Default Admin Account
- **Email**: admin@bookshelf.com
- **Password**: admin123
- **Role**: admin

## File Structure
```
Bookshelf_library/
├── public/
│   ├── login.html          # Login page
│   ├── register.html       # Registration page
│   ├── dashboard.html      # User dashboard (new)
│   ├── admin.html          # Admin panel (upload/edit/delete)
│   └── index.html          # Main library page
├── security/
│   ├── register-login.js   # Auth logic (enhanced)
│   ├── auth-required.js   # Middleware
│   └── ...
├── server.js               # Main server (updated)
└── db.js                   # Database setup
```

## Usage

### For Users
1. Visit `/register.html` to create an account
2. Fill in username, email, and password
3. After registration, you'll be redirected to your dashboard
4. Use the "Upload New Book" button to add books
5. View your uploaded books in the dashboard

### For Developers
1. Start the server: `npm start`
2. The system automatically creates the database and tables
3. Default admin account is created on first run
4. All authentication is handled via session cookies

## Error Codes

- `missing_fields` - Required fields not provided
- `invalid_email` - Email format is invalid
- `domain_not_allowed` - Email domain not in allowed list
- `invalid_username` - Username format invalid
- `username_taken` - Username already exists
- `email_taken` - Email already registered
- `weak_password` - Password doesn't meet requirements
- `invalid_credentials` - Wrong email or password
- `account_locked` - Too many failed attempts
- `account_disabled` - Account has been disabled
- `authentication_required` - Must be logged in
- `forbidden` - Insufficient permissions

## Future Enhancements

- [ ] Email verification
- [ ] Password reset functionality
- [ ] User profile editing
- [ ] Profile pictures
- [ ] Social login (Google, GitHub)
- [ ] Two-factor authentication
- [ ] User roles and permissions UI
- [ ] Activity log