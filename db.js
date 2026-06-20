const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "bookshelf.db");
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema();
    seedData();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('user','admin')),
      preferred_language TEXT DEFAULT 'en',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_key TEXT UNIQUE NOT NULL,
      icon TEXT DEFAULT '📚',
      parent_id INTEGER REFERENCES categories(id),
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS languages (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      native_name TEXT NOT NULL,
      icon TEXT DEFAULT '🌐'
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      language TEXT DEFAULT 'en' REFERENCES languages(code),
      category_id INTEGER REFERENCES categories(id),
      year INTEGER,
      isbn TEXT,
      pages INTEGER,
      publisher TEXT,
      cover_image TEXT,
      file_path TEXT NOT NULL,
      file_format TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      uploaded_by INTEGER REFERENCES users(id),
      is_recommended INTEGER DEFAULT 0,
      is_public_domain INTEGER DEFAULT 0,
      downloads INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS book_authors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      author_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS book_categories (
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY (book_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS translations (
      key TEXT NOT NULL,
      language TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (key, language)
    );

    CREATE TABLE IF NOT EXISTS reading_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      position TEXT DEFAULT '0',
      percentage REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, book_id)
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      review TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, book_id)
    );

    CREATE INDEX IF NOT EXISTS idx_books_category ON books(category_id);
    CREATE INDEX IF NOT EXISTS idx_books_language ON books(language);
    CREATE INDEX IF NOT EXISTS idx_books_year ON books(year);
    CREATE INDEX IF NOT EXISTS idx_books_recommended ON books(is_recommended);
    CREATE INDEX IF NOT EXISTS idx_books_uploader ON books(uploaded_by);
    CREATE INDEX IF NOT EXISTS idx_book_authors ON book_authors(author_name);
  `);
}

function seedData() {
  const count = db.prepare("SELECT COUNT(*) as c FROM categories").get();
  if (count.c > 0) return;

  const insertCat = db.prepare("INSERT INTO categories (name_key, icon, sort_order) VALUES (?, ?, ?)");
  const categories = [
    ["cat_fiction", "📖", 1],
    ["cat_non_fiction", "📘", 2],
    ["cat_science", "🔬", 3],
    ["cat_technology", "💻", 4],
    ["cat_philosophy", "🧠", 5],
    ["cat_history", "📜", 6],
    ["cat_poetry", "📝", 7],
    ["cat_drama", "🎭", 8],
    ["cat_fantasy", "🐉", 9],
    ["cat_sci_fi", "🚀", 10],
    ["cat_mystery", "🔍", 11],
    ["cat_romance", "💕", 12],
    ["cat_horror", "👻", 13],
    ["cat_biography", "👤", 14],
    ["cat_self_help", "💪", 15],
    ["cat_art", "🎨", 16],
    ["cat_music", "🎵", 17],
    ["cat_religion", "⛪", 18],
    ["cat_education", "🎓", 19],
    ["cat_children", "🧒", 20],
    ["cat_comics", "💬", 21],
    ["cat_reference", "📚", 22],
    ["cat_travel", "✈️", 23],
    ["cat_cooking", "🍳", 24],
    ["cat_sports", "⚽", 25],
    ["cat_nature", "🌿", 26],
  ];
  const tx = db.transaction(() => {
    for (const c of categories) insertCat.run(...c);
  });
  tx();

  // Seed languages
  const insertLang = db.prepare("INSERT OR IGNORE INTO languages (code, name, native_name, icon) VALUES (?, ?, ?, ?)");
  const languages = [
    ["en", "English", "English", "🇬🇧"],
    ["it", "Italian", "Italiano", "🇮🇹"],
    ["fr", "French", "Français", "🇫🇷"],
    ["es", "Spanish", "Español", "🇪🇸"],
    ["de", "German", "Deutsch", "🇩🇪"],
    ["pt", "Portuguese", "Português", "🇵🇹"],
    ["nl", "Dutch", "Nederlands", "🇳🇱"],
    ["ru", "Russian", "Русский", "🇷🇺"],
    ["zh", "Chinese", "中文", "🇨🇳"],
    ["ja", "Japanese", "日本語", "🇯🇵"],
    ["ko", "Korean", "한국어", "🇰🇷"],
    ["ar", "Arabic", "العربية", "🇸🇦"],
    ["hi", "Hindi", "हिन्दी", "🇮🇳"],
    ["tr", "Turkish", "Türkçe", "🇹🇷"],
    ["pl", "Polish", "Polski", "🇵🇱"],
    ["sv", "Swedish", "Svenska", "🇸🇪"],
    ["da", "Danish", "Dansk", "🇩🇰"],
    ["no", "Norwegian", "Norsk", "🇳🇴"],
    ["fi", "Finnish", "Suomi", "🇫🇮"],
    ["el", "Greek", "Ελληνικά", "🇬🇷"],
    ["he", "Hebrew", "עברית", "🇮🇱"],
    ["th", "Thai", "ไทย", "🇹🇭"],
    ["vi", "Vietnamese", "Tiếng Việt", "🇻🇳"],
    ["sw", "Swahili", "Kiswahili", "🇰🇪"],
  ];
  const tx2 = db.transaction(() => {
    for (const l of languages) insertLang.run(...l);
  });
  tx2();

  // Seed admin user (password: admin123)
  const bcrypt = require("bcryptjs");
  const hash = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)").run("admin", "admin@bookshelf.com", hash, "admin");
}

module.exports = { getDb };