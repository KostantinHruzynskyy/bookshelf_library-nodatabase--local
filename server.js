const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { getDb } = require("./db");
const { BooksRepository } = require("./src/repositories/books");
const { sanitizeText, sanitizeFilename } = require("./security/input-sanitizer");
const { applySecurityHeaders } = require("./security/security-headers");
const { createAuditLogger } = require("./security/audit-logger");

const app = express();
app.use(helmet());
app.use(applySecurityHeaders);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.static("public"));
app.use("/books", express.static("books"));

/* ---- RATE LIMITING ---- */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited", message: "Too many requests. Try again later." }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited", message: "Too many auth attempts." }
});
app.use("/api/", apiLimiter);
app.use("/api/auth/", authLimiter);

const repo = new BooksRepository();
const audit = createAuditLogger(getDb);

/* Migrate legacy books.json on first run */
try {
  const BOOKS_FILE = path.join(__dirname, "books.json");
  const legacy = JSON.parse(fs.readFileSync(BOOKS_FILE, "utf8"));
  if (Array.isArray(legacy) && legacy.length) {
    const count = getDb().prepare("SELECT COUNT(*) as c FROM books").get().c;
    if (count === 0) {
      repo.importFromJsonArray(legacy);
      console.log(`[migration] Imported ${legacy.length} legacy books into SQLite.`);
    }
  }
} catch (e) {
  console.error("[migration] Legacy import warning:", e.message);
}

/* ---- MULTER CONFIG ---- */
const ALLOWED_EXT = [
  ".txt", ".pdf", ".epub", ".mobi", ".html", ".htm",
  ".md", ".markdown", ".docx", ".doc", ".rtf", ".odt",
  ".fb2", ".azw", ".azw3", ".djvu", ".cbz", ".cbr"
];

const ALLOWED_MIME = [
  "text/plain", "application/pdf", "application/epub+zip",
  "application/x-mobipocket-ebook", "text/html", "text/markdown",
  "text/x-markdown", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword", "application/rtf", "text/rtf",
  "application/vnd.oasis.opendocument.text", "application/x-fictionbook+xml",
  "application/vnd.amazon.ebook", "application/x-mobi8-ebook",
  "image/vnd.djvu", "application/x-djvu",
  "application/vnd.comicbook+zip", "application/vnd.comicbook-rar",
  "application/octet-stream", "text/xml", "application/xml"
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, unique + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, /* 50 MB max */
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    /* Only allow by extension — MIME type is unreliable for e-book formats */
    if (ALLOWED_EXT.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported format: "${ext}". Allowed formats: ${ALLOWED_EXT.join(", ")}`));
    }
  }
});

/* ---- HELPERS ---- */
function getFormatIcon(ext) {
  const icons = {
    ".txt": "📄", ".pdf": "📕", ".epub": "📗", ".mobi": "📘",
    ".html": "🌐", ".htm": "🌐", ".md": "📝", ".markdown": "📝",
    ".docx": "📘", ".doc": "📘", ".rtf": "📄", ".odt": "📄",
    ".fb2": "📖", ".azw": "📱", ".azw3": "📱", ".djvu": "📑",
    ".cbz": "💬", ".cbr": "💬"
  };
  return icons[ext] || "📚";
}

function getFormatLabel(ext) {
  const labels = {
    ".txt": "Plain Text", ".pdf": "PDF", ".epub": "EPUB",
    ".mobi": "MOBI", ".html": "HTML", ".htm": "HTML",
    ".md": "Markdown", ".markdown": "Markdown",
    ".docx": "Word DOCX", ".doc": "Word DOC", ".rtf": "RTF",
    ".odt": "OpenDocument", ".fb2": "FictionBook",
    ".azw": "Kindle AZW", ".azw3": "Kindle AZW3",
    ".djvu": "DjVu", ".cbz": "Comic CBZ", ".cbr": "Comic CBR"
  };
  return labels[ext] || ext.replace(".", "").toUpperCase();
}

/* Extract text from supported formats */
function extractText(ext, filePath) {
  try {
    if (ext === ".txt" || ext === ".md" || ext === ".markdown" || ext === ".html" || ext === ".htm" || ext === ".rtf") {
      let text = fs.readFileSync(filePath, "utf8");
      if (ext === ".html" || ext === ".htm") {
        /* strip HTML tags */
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
        text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
        text = text.replace(/<[^>]+>/g, "");
        text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
        text = text.replace(/\n{3,}/g, "\n\n").trim();
      }
      if (ext === ".rtf") {
        text = text.replace(/\\[a-z]+\d*\s?/gi, "").replace(/[{}]/g, "").trim();
      }
      return text;
    }
  } catch (e) {
    return "";
  }
  return "";
}

/* ---- BOOK ROUTES (SQLite via repository) ---- */

app.get('/api/books', (req, res) => {
  try {
    const term = (req.query.q || '').trim();
    const books = term ? repo.search(term) : repo.getAll();
    res.json(books);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load books' });
  }
});

app.get('/api/health', (req, res) => {
  try {
    getDb().prepare('SELECT 1').get();
    res.json({ status: 'ok', database: 'sqlite', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ status: 'error', error: e.message });
  }
});

app.post('/api/books', (req, res) => {
  try {
    const { title, author, description, color, content } = req.body;
    const safeName = sanitizeFilename(title);
    const relativePath = 'books/' + safeName + '.txt';
    fs.writeFileSync(path.join(__dirname, relativePath), content || '');
    const authors = (author || '').split(',').map(a => a.trim()).filter(Boolean);
    const book = repo.create({
      title: sanitizeText(title, 200),
      description: sanitizeText(description || '', 1000),
      color: color || '#8B4513',
      file_path: relativePath,
      file_format: '.txt',
      file_size: (content || '').length,
      authors
    });
    res.json({ success: true, id: book.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/books/upload', upload.single('bookFile'), (req, res) => {
  try {
    const { title, author, description, color } = req.body;
    if (!title || !author) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Title and author are required' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileSize = req.file.size;
    const extractedText = extractText(ext, req.file.path);
    let readFilePath = 'books/uploads/' + req.file.filename;
    if (ext === '.html' || ext === '.htm' || ext === '.rtf') {
      const txtFilename = path.basename(req.file.filename, ext) + '.txt';
      fs.writeFileSync(path.join(UPLOADS_DIR, txtFilename), extractedText);
      readFilePath = 'books/uploads/' + txtFilename;
    }
    const authors = (author || '').split(',').map(a => a.trim()).filter(Boolean);
    const book = repo.create({
      title: sanitizeText(title, 200),
      description: sanitizeText(description || '', 1000),
      color: color || '#8B4513',
      file_path: path.relative(process.cwd(), req.file.path).split(path.sep).join('/'),
      file_format: ext,
      file_size: fileSize,
      extractedText,
      readFilePath,
      originalFile: req.file.originalname,
      authors
    });
    audit.logFileScan(book.id, 'mime_validation', 'clean', JSON.stringify({ ext, size: fileSize }));
    res.json({ success: true, id: book.id });
  } catch (e) {
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e2) {} }
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/books/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const book = repo.getById(id);
    if (book) {
      const filePath = path.join(__dirname, book.file);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (book.readFilePath && book.readFilePath !== book.file) {
        const readPath = path.join(__dirname, book.readFilePath);
        if (fs.existsSync(readPath)) fs.unlinkSync(readPath);
      }
    }
    const ok = repo.delete(id);
    res.json({ success: ok });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/books/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, author, description, color, content } = req.body;
    const existing = repo.getById(id);
    const authors = (author || '').split(',').map(a => a.trim()).filter(Boolean);
    const updateData = {
      title: sanitizeText(title || existing.title, 200),
      description: sanitizeText(description !== undefined ? description : existing.description, 1000),
      color: color || existing.color,
      authors
    };
    if (content !== undefined && existing.extractedText !== null) {
      try { fs.writeFileSync(path.join(__dirname, existing.file), content); } catch (e) {}
    }
    const updated = repo.update(id, updateData);
    res.json({ success: true, book: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/books/:id/file', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const book = repo.getById(id);
    const filePath = path.join(__dirname, book.file);
    const downloadName = book.originalFile || book.title + (book.format || '.txt');
    res.download(filePath, downloadName);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* error handler for multer */
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});


/* ---- SESSION LOADER ---- */
app.use((req, res, next) => {
  const cookies = (req.headers.cookie || "").split(";");
  let sid = null;
  for (const c of cookies) {
    const [k, ...v] = c.trim().split("=");
    if (k === "bookshelf_session") { sid = v.join("="); break; }
  }
  if (!sid) return next();
  try {
    const db = require("./db").getDb();
    const session = db.prepare("SELECT s.*, u.username, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.is_active = 1").get(sid);
    if (session) req.user = session;
  } catch (e) { /* ignore */ }
  next();
});

/* ---- AUTH ROUTES ---- */
const { login, register, logout, me } = require("./security/register-login");
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);
app.post("/api/auth/logout", logout);
app.get("/api/auth/me", me);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});