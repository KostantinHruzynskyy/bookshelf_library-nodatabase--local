# Bookshelf Library - API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
All protected endpoints require a session cookie (`bookshelf_session`) obtained via login or registration.

---

## 🔐 Authentication

### POST /api/auth/register
Register a new account.
```json
Body: { "username": "string", "email": "string", "password": "string" }
Response: { "ok": true, "user": { ... } }
```

### POST /api/auth/login
```json
Body: { "email": "string", "password": "string" }
Response: { "ok": true, "user": { ... } }
```
Sets `bookshelf_session` cookie.

### POST /api/auth/logout
Clears session cookie.

### GET /api/auth/me
Returns current authenticated user.
```json
Response: { "ok": true, "user": { "id", "username", "email", "role", ... } }
```

### POST /api/auth/request-verification
Request email verification token. **Requires auth.**

### GET /api/auth/verify-email?token=TOKEN
Verify email with token.

### POST /api/auth/request-reset
Request password reset link.
```json
Body: { "email": "string" }
Response: { "ok": true, "message": "If an account exists..." }
```
Does not reveal if email exists (anti-enumeration).

### POST /api/auth/confirm-reset
```json
Body: { "token": "string", "password": "string" }
Response: { "ok": true, "message": "Password has been reset..." }
```

### GET /api/auth/validate-reset-token?token=TOKEN
Check if a reset token is valid.

---

## 👤 User Profile

### GET /api/user/profile
Get current user's profile with book count and recent books. **Requires auth.**

### GET /api/user/books?page=1&limit=20
Get user's uploaded books with pagination. **Requires auth.**

### PUT /api/user/profile
Update profile fields. **Requires auth.**
```json
Body: { "username": "string", "preferred_language": "en|it|fr|es|de" }
```

### POST /api/user/change-password
**Requires auth.**
```json
Body: { "currentPassword": "string", "newPassword": "string" }
```
Password must meet strength requirements (8+ chars, uppercase, lowercase, number, special char).

### POST /api/user/change-email
**Requires auth.**
```json
Body: { "email": "new@email.com", "password": "current_password" }
```
Resets email verification status.

---

## ⭐ Ratings & Reviews

### POST /api/books/:bookId/ratings
Submit or update a rating. **Requires auth.**
```json
Body: { "rating": 1-5, "review": "string (optional, max 2000)" }
```

### GET /api/books/:bookId/ratings?page=1&limit=10
Get all ratings for a book with stats.
```json
Response: {
  "ok": true,
  "ratings": [...],
  "stats": { "total": 10, "average": 4.2, "distribution": { "5": 3, "4": 4, ... } },
  "pagination": { ... }
}
```

### GET /api/books/:bookId/ratings/me
Get current user's rating for a book. **Requires auth.**

### DELETE /api/books/:bookId/ratings
Delete current user's rating. **Requires auth.**

---

## 🔍 Search

### GET /api/search?q=query&format=.pdf&sort=title&page=1&limit=20
Search books with filters and pagination.
- `q` - search term (title, author, description, publisher, ISBN)
- `format` - filter by file format
- `minRating` - filter by minimum average rating
- `category` - filter by category ID
- `language` - filter by language code
- `sort` - `relevance|title|author|newest|oldest|downloads|views`
- `page`, `limit` - pagination

---

## 📚 Books

### GET /api/books
List all books.

### POST /api/books
Add a book with text content.

### POST /api/books/upload
Upload a book file (multipart form).

### PUT /api/books/:id
Update book metadata.

### DELETE /api/books/:id
Delete a book.

### GET /api/books/:id/file
Download a book file.

---

## ⚙️ Admin
All admin endpoints require authentication + admin/moderator role.

### GET /api/admin/users?page=1&limit=20
List all users with pagination.

### PUT /api/admin/users/:userId
Update user role or status.
```json
Body: { "role": "user|moderator|admin", "is_active": true|false }
```

### DELETE /api/admin/users/:userId
Delete a user (cannot delete admin users).

### GET /api/admin/stats
System statistics.
```json
Response: { "ok": true, "stats": { "users", "activeUsers", "books", "ratings", "sessions", "unverified" } }
```

### GET /api/admin/books?page=1&limit=20
List all books with uploader info.

### PUT /api/admin/books/:bookId/toggle
Toggle book active/inactive status.

---

## 🏥 Health

### GET /api/health
```json
Response: { "status": "ok" }
```
Returns 503 if database is unavailable.

---

## 🔒 Security Features
- Session-based authentication with HTTP-only cookies
- CSRF token generation and validation
- Rate limiting (100 req/15min general, 10 req/15min auth)
- Security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
- Account lockout after 5 failed login attempts (30 min lock)
- Password strength validation
- Email domain validation (disposable email blocking)
- Input sanitization (XSS, injection prevention)
- Audit logging

## 📝 Error Response Format
```json
{ "error": "error_code", "message": "Human-readable message" }
```

Common error codes:
- `authentication_required` (401)
- `forbidden` (403)
- `account_locked` (423)
- `rate_limited` (429)
- `invalid_credentials` (401)
- `weak_password` (400)
- `csrf_invalid` (403)
