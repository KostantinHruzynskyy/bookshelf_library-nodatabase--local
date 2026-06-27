# Bookshelf Library v2.0 - Advanced System

## Features

### Multi-Database Support
- **SQLite** - Development, zero config (default)
- **PostgreSQL** - Production, scalable
- **MySQL** - Shared hosting compatible

### Advanced CRUD
- Users: Full CRUD with roles, status control
- Books: Upload, edit, delete with file management
- Sessions: Secure management with audit trail
- Categories & Languages: Organize content

### DevOps Tools
- Docker container deployment
- Health check endpoints
- Automated database backups
- Performance metrics
- Winston logging
- CI/CD ready

## Quick Start

```bash
npm install
cp .env.example .env
npm start
```

Visit: http://localhost:3000

## Database Configuration

### SQLite (Default)
```env
DB_TYPE=sqlite
DB_PATH=./bookshelf.db
```

### PostgreSQL
```env
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bookshelf
DB_USER=postgres
DB_PASSWORD=yourpassword
```

### MySQL
```env
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=bookshelf
DB_USER=root
DB_PASSWORD=yourpassword
```

## Docker

```bash
# Build and run
npm run docker:build
npm run docker:run

# Or use docker-compose
docker-compose up -d
```

## API Endpoints

### Health
- `GET /api/health` - Health check
- `GET /api/metrics` - System metrics (admin)

### Auth
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user

### Users (Protected)
- `GET /api/user/profile` - Profile
- `GET /api/user/books` - User's books

### Books
- `GET /api/books` - List books (public)
- `GET /api/books/:id` - Book details (public)
- `POST /api/books/upload` - Upload (auth required)
- `PUT /api/books/:id` - Update (auth required)
- `DELETE /api/books/:id` - Delete (auth required)

### Admin
- `GET /api/admin/users` - List users
- `PUT /api/admin/users/:id/role` - Change role
- `PUT /api/admin/users/:id/status` - Activate/deactivate
- `DELETE /api/admin/users/:id` - Delete user

## Database Management

```bash
npm run db:migrate    # Run migrations
npm run db:seed       # Seed test data
npm run db:backup     # Backup database
npm run db:restore    # Restore from backup
```

## Testing & Code Quality

```bash
npm test              # Run tests
npm run lint          # Lint code
npm run lint:fix      # Fix lint errors
```

## Monitoring

```bash
npm run health        # Health check
npm run monitor       # Performance monitoring
```

## Security

- Password hashing (bcrypt)
- SQL injection prevention
- XSS protection (Helmet)
- CSRF protection
- Rate limiting
- Input validation
- Secure sessions
- Audit logging

## Files Created

- `config/database.js` - Database config
- `db/adapter.js` - Database adapter
- `db/factory.js` - Database factory
- `db/adapters/` - SQLite, PostgreSQL, MySQL adapters
- `scripts/` - Health, backup, monitoring scripts
- `Dockerfile` - Docker image
- `docker-compose.yml` - Docker Compose
- `.env.example` - Environment template

## Production Checklist

- [ ] Choose production database
- [ ] Set strong secrets
- [ ] Configure SSL/TLS
- [ ] Set up backups
- [ ] Configure monitoring
- [ ] Set up CI/CD
- [ ] Load testing
- [ ] Security audit

---

**Version 2.0** - Multi-database, advanced CRUD, DevOps ready! 🎉