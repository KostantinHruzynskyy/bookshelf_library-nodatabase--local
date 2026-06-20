# Bookshelf Library — Piano di Ristrutturazione Massiva

## Architettura

### Backend (server.js → refactor completo)
- **Database**: SQLite (better-sqlite3) invece di JSON
- **Auth**: bcryptjs + express-session (registrazione/login)
- **Sicurezza**: helmet, express-rate-limit, input sanitization, CSRF
- **Multi-lingua**: sistema i18n con 20+ lingue
- **API REST** estesa con tutti i nuovi endpoint

### Database Schema
```
users
  - id INTEGER PRIMARY KEY
  - username TEXT UNIQUE
  - email TEXT UNIQUE
  - password_hash TEXT
  - role TEXT (user/admin)
  - preferred_language TEXT
  - created_at DATETIME

categories
  - id INTEGER PRIMARY KEY
  - name TEXT UNIQUE
  - description TEXT
  - icon TEXT

books
  - id INTEGER PRIMARY KEY
  - title TEXT
  - author TEXT
  - year INTEGER
  - description TEXT
  - language TEXT
  - category_id INTEGER → categories
  - file_path TEXT
  - file_format TEXT
  - file_size INTEGER
  - cover_image TEXT
  - isbn TEXT
  - pages INTEGER
  - publisher TEXT
  - uploaded_by INTEGER → users
  - is_recommended BOOLEAN
  - downloads INTEGER DEFAULT 0
  - views INTEGER DEFAULT 0
  - created_at DATETIME
  - updated_at DATETIME

book_authors (per autori multipli)
  - id INTEGER PRIMARY KEY
  - book_id INTEGER → books
  - author_name TEXT

translations (per UI multi-lingua)
  - key TEXT
  - language TEXT
  - value TEXT
  - PRIMARY KEY (key, language)
```

### Frontend
- **index.html** → Libreria con filtri per categoria, lingua, anno
- **login.html** / **register.html** → Auth pages
- **admin.html** → Admin panel potenziato
- **reader.html** → Reader migliorato
- **upload.html** → Upload con metadati completi
- **i18n.js** → Sistema di traduzione lato client

### UI Multi-lingua (20+ lingue)
Italiano, Inglese, Francese, Spagnolo, Tedesco, Portoghese, Olandese, Russo, Cinese, Giapponese, Coreano, Arabo, Hindi, Turco, Polacco, Svedese, Danese, Norvegese, Finlandese, Greco

### Footer
- Credit: "Skyy" in piccolo
- Disclaimer legale: "Non-profit, solo per diffondere l'intelligenza"
- Link alle policy

### Sicurezza
- Helmet headers
- Rate limiting (100 req/min per IP)
- Input sanitization (XSS)
- SQL injection protetto da prepared statements
- Password hashing (bcrypt)
- Session management
- File upload validation