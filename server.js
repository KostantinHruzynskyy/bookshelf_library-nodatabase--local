const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { applySecurity } = require('./src/middleware/apply-security');
const { authRequired, adminRequired } = require('./src/middleware/auth-middleware');

const app = express();
applySecurity(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/books", express.static("books"));

const BOOKS_FILE = path.join(__dirname, "books.json");
const BOOKS_DIR = path.join(__dirname, "books");
const UPLOADS_DIR = path.join(__dirname, "books", "uploads");

/* ensure folders exist */
[BOOKS_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* ensure books.json exists */
if (!fs.existsSync(BOOKS_FILE)) {
  fs.writeFileSync(BOOKS_FILE, "[]");
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

/* ---- API ROUTES ---- */

/* get books */
app.get("/api/books", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(BOOKS_FILE, "utf8"));
    res.json(data);
  } catch (e) {
    res.json([]);
  }
});

/* add book (text content) */
app.post("/api/books", (req, res) => {
  const { title, author, description, color, content } = req.body;

  if (!title || !author) {
    return res.status(400).json({ error: "Title and author are required" });
  }

  const safeName = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const filePath = `books/${safeName}.txt`;

  fs.writeFileSync(path.join(__dirname, filePath), content || "");

  const books = JSON.parse(fs.readFileSync(BOOKS_FILE, "utf8"));
  books.push({
    id: Date.now(),
    title,
    author,
    description: description || "",
    color: color || "#8B4513",
    file: filePath,
    format: ".txt",
    formatIcon: "📄",
    formatLabel: "Plain Text",
    fileSize: (content || "").length
  });

  fs.writeFileSync(BOOKS_FILE, JSON.stringify(books, null, 2));
  res.json({ success: true });
});

/* upload book file */
app.post("/api/books/upload", upload.single("bookFile"), (req, res) => {
  try {
    const { title, author, description, color } = req.body;

    if (!title || !author) {
      /* cleanup uploaded file */
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Title and author are required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileSize = req.file.size;

    /* try to extract text for readable formats */
    const extractedText = extractText(ext, req.file.path);

    /* if we extracted text, also save a .txt copy for the reader */
    let readFilePath = `books/uploads/${req.file.filename}`;
    if (ext === ".txt" || ext === ".md" || ext === ".markdown") {
      /* text files can be read directly */
      readFilePath = `books/uploads/${req.file.filename}`;
    } else if (ext === ".html" || ext === ".htm" || ext === ".rtf") {
      /* save extracted text as .txt for reading */
      const txtFilename = path.basename(req.file.filename, ext) + ".txt";
      fs.writeFileSync(path.join(UPLOADS_DIR, txtFilename), extractedText);
      readFilePath = `books/uploads/${txtFilename}`;
    }
    /* For PDF, EPUB, MOBI, etc. the original file is stored but can't be read as text */

    const books = JSON.parse(fs.readFileSync(BOOKS_FILE, "utf8"));
    const bookId = Date.now();

    books.push({
      id: bookId,
      title,
      author,
      description: description || "",
      color: color || "#8B4513",
      file: `books/uploads/${req.file.filename}`,
      originalFile: req.file.originalname,
      format: ext,
      formatIcon: getFormatIcon(ext),
      formatLabel: getFormatLabel(ext),
      fileSize,
      extractedText: extractedText || null,
      readFilePath
    });

    fs.writeFileSync(BOOKS_FILE, JSON.stringify(books, null, 2));
    res.json({ success: true, id: bookId });
  } catch (e) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e2) { /* ignore */ }
    }
    res.status(500).json({ error: e.message });
  }
});

/* delete book */
app.delete("/api/books/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const books = JSON.parse(fs.readFileSync(BOOKS_FILE, "utf8"));
  const book = books.find(b => b.id === id);

  if (book) {
    /* remove uploaded file */
    const filePath = path.join(__dirname, book.file);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    /* remove extracted txt if different */
    if (book.readFilePath && book.readFilePath !== book.file) {
      const readPath = path.join(__dirname, book.readFilePath);
      if (fs.existsSync(readPath)) fs.unlinkSync(readPath);
    }
  }

  const filtered = books.filter(b => b.id !== id);
  fs.writeFileSync(BOOKS_FILE, JSON.stringify(filtered, null, 2));
  res.json({ success: true });
});

/* update book */
app.put("/api/books/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { title, author, description, color, content } = req.body;
  const books = JSON.parse(fs.readFileSync(BOOKS_FILE, "utf8"));
  const index = books.findIndex(b => b.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Book not found" });
  }

  const book = books[index];

  /* update text file if content provided (only for text-based books) */
  if (content !== undefined && book.extractedText !== undefined) {
    try {
      fs.writeFileSync(path.join(book.file), content);
    } catch (e) { /* file might not be writable */ }
  }

  books[index] = {
    ...book,
    title: title || book.title,
    author: author || book.author,
    description: description !== undefined ? description : book.description,
    color: color || book.color
  };

  fs.writeFileSync(BOOKS_FILE, JSON.stringify(books, null, 2));
  res.json({ success: true });
});

/* serve book file for download/viewing */
app.get("/api/books/:id/file", (req, res) => {
  const id = parseInt(req.params.id);
  const books = JSON.parse(fs.readFileSync(BOOKS_FILE, "utf8"));
  const book = books.find(b => b.id === id);

  if (!book) return res.status(404).json({ error: "Book not found" });

  const filePath = path.join(__dirname, book.file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });

  res.download(filePath, book.originalFile || book.title + book.format);
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
    const db = require("./src/database/connection").getDb();
    const session = db.prepare("SELECT s.id as sessionId, s.user_id, s.ip_address, s.user_agent, s.created_at as session_created, s.expires_at, s.is_active as session_active, u.id, u.username, u.email, u.role, u.preferred_language, u.is_active as user_active, u.created_at, u.last_login_at, u.failed_login_attempts, u.locked_until FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.is_active = 1").get(sid);
    if (session) req.user = session;
  } catch (e) { /* ignore */ }
  next();
});

/* ---- AUTH ROUTES ---- */
const { login, register, logout, me, getUserProfile, getUserBooks } = require("./src/services/auth-service");
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);
app.post("/api/auth/logout", logout);
app.get("/api/auth/me", me);

/* ---- EMAIL VERIFICATION ---- */
const { requestVerification, verifyEmailRoute } = require("./src/services/email-verification");
app.post("/api/auth/request-verification", authRequired, requestVerification);
app.get("/api/auth/verify-email", verifyEmailRoute);
app.post("/api/auth/verify-email", verifyEmailRoute);

/* ---- PASSWORD RESET ---- */
const { requestReset, confirmPasswordReset, validateResetToken } = require("./src/services/password-reset");
app.post("/api/auth/request-reset", requestReset);
app.post("/api/auth/confirm-reset", confirmPasswordReset);
app.get("/api/auth/validate-reset-token", validateResetToken);


/* ---- USER ROUTES ---- */
app.get('/api/user/profile', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  try {
    const profile = getUserProfile(req.user.id);
    res.json({ ok: true, profile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/user/books', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'not_logged_in' });
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const result = getUserBooks(req.user.id, page, limit);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---- PROFILE EDITING ---- */
const { updateProfileRoute, changePasswordRoute, changeEmailRoute } = require("./src/services/profile-service");
app.put("/api/user/profile", authRequired, updateProfileRoute);
app.post("/api/user/change-password", authRequired, changePasswordRoute);
app.post("/api/user/change-email", authRequired, changeEmailRoute);

/* ---- BOOK RATINGS/REVIEWS ---- */
const { submitRatingRoute, getBookRatingsRoute, getUserRatingRoute, deleteRatingRoute } = require("./src/services/ratings-service");
app.post("/api/books/:bookId/ratings", authRequired, submitRatingRoute);
app.get("/api/books/:bookId/ratings", getBookRatingsRoute);
app.get("/api/books/:bookId/ratings/me", authRequired, getUserRatingRoute);
app.delete("/api/books/:bookId/ratings", authRequired, deleteRatingRoute);

/* ---- SEARCH ---- */
const { searchRoute } = require("./src/services/search-service");
app.get("/api/search", searchRoute);

/* ---- HEALTH ---- */
app.get('/api/health', (req, res) => {
  try {
    require("./src/database/connection").getDb().prepare("SELECT 1").get();
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(503).json({ status: 'error' });
  }
});


/* ---- ADMIN ROUTES ---- */
const { listUsersRoute, updateUserRoute, deleteUserRoute, statsRoute, listAllBooksRoute, toggleBookActiveRoute } = require("./src/services/admin-service");
app.get('/api/admin/users', authRequired, adminRequired, listUsersRoute);
app.put('/api/admin/users/:userId', authRequired, adminRequired, updateUserRoute);
app.delete('/api/admin/users/:userId', authRequired, adminRequired, deleteUserRoute);
app.get('/api/admin/stats', authRequired, adminRequired, statsRoute);
app.get('/api/admin/books', authRequired, adminRequired, listAllBooksRoute);
app.put('/api/admin/books/:bookId/toggle', authRequired, adminRequired, toggleBookActiveRoute);

/* ---- STATIC PAGES ---- */
// Function to serve HTML pages
function servePage(req, res, page) {
  res.sendFile(path.join(__dirname, `public/pages/${page}.html`));
}

// Home page
app.get("/", (req, res) => servePage(req, res, "index"));

// Login page - both /login and /login.html
app.get("/login", (req, res) => servePage(req, res, "login"));
app.get("/login.html", (req, res) => servePage(req, res, "login"));

// Register page - both /register and /register.html
app.get("/register", (req, res) => servePage(req, res, "register"));
app.get("/register.html", (req, res) => servePage(req, res, "register"));

// Dashboard page - both /dashboard and /dashboard.html
app.get("/dashboard", (req, res) => servePage(req, res, "dashboard"));
app.get("/dashboard.html", (req, res) => servePage(req, res, "dashboard"));

// Profile page - both /profile and /profile.html
app.get("/profile", (req, res) => servePage(req, res, "profile"));
app.get("/profile.html", (req, res) => servePage(req, res, "profile"));

// Admin page - both /admin and /admin.html
app.get("/admin", (req, res) => servePage(req, res, "admin"));
app.get("/admin.html", (req, res) => servePage(req, res, "admin"));

// Reader page - both /reader and /reader.html
app.get("/reader", (req, res) => servePage(req, res, "reader"));
app.get("/reader.html", (req, res) => servePage(req, res, "reader"));

// Forgot password page
app.get("/forgot-password", (req, res) => servePage(req, res, "forgot-password"));
app.get("/forgot-password.html", (req, res) => servePage(req, res, "forgot-password"));

// Reset password page
app.get("/reset-password", (req, res) => servePage(req, res, "reset-password"));
app.get("/reset-password.html", (req, res) => servePage(req, res, "reset-password"));

/* ---- NOTIFICATIONS ---- */
const { createRoute: createNotif, listRoute: listNotif, markReadRoute: markReadNotif, markAllReadRoute: markAllReadNotif, deleteRoute: deleteNotif, clearRoute: clearNotif } = require("./src/services/notifications-service");
app.post("/api/notifications", authRequired, createNotif);
app.get("/api/notifications", authRequired, listNotif);
app.put("/api/notifications/:id/read", authRequired, markReadNotif);
app.put("/api/notifications/read-all", authRequired, markAllReadNotif);
app.delete("/api/notifications/:id", authRequired, deleteNotif);
app.delete("/api/notifications", authRequired, clearNotif);

/* ---- BOOKMARKS ---- */
const { addRoute: addBookmark, removeRoute: removeBookmark, listRoute: listBookmarks, checkRoute: checkBookmark } = require("./src/services/bookmarks-service");
app.post("/api/books/:bookId/bookmark", authRequired, addBookmark);
app.delete("/api/books/:bookId/bookmark", authRequired, removeBookmark);
app.get("/api/bookmarks", authRequired, listBookmarks);
app.get("/api/books/:bookId/bookmark", authRequired, checkBookmark);

/* ---- WISHLIST ---- */
const { addRoute: addWish, removeRoute: removeWish, listRoute: listWish, checkRoute: checkWish } = require("./src/services/wishlist-service");
app.post("/api/books/:bookId/wishlist", authRequired, addWish);
app.delete("/api/books/:bookId/wishlist", authRequired, removeWish);
app.get("/api/wishlist", authRequired, listWish);
app.get("/api/books/:bookId/wishlist", authRequired, checkWish);

/* ---- TAGS ---- */
const { createTagRoute, listTagsRoute, deleteTagRoute, addTagToBookRoute, removeTagFromBookRoute, getBookTagsRoute, getBooksByTagRoute } = require("./src/services/tags-service");
app.post("/api/tags", authRequired, createTagRoute);
app.get("/api/tags", listTagsRoute);
app.delete("/api/tags/:tagId", authRequired, deleteTagRoute);
app.post("/api/books/:bookId/tags", authRequired, addTagToBookRoute);
app.delete("/api/books/:bookId/tags/:tagId", authRequired, removeTagFromBookRoute);
app.get("/api/books/:bookId/tags", getBookTagsRoute);
app.get("/api/tags/:tagId/books", getBooksByTagRoute);

/* ---- COMMENTS ---- */
const { addRoute: addComment, editRoute: editComment, deleteRoute: deleteComment, listRoute: listComments, flagRoute: flagComment, flaggedListRoute: flaggedComments, unflagRoute: unflagComment } = require("./src/services/comments-service");
app.post("/api/books/:bookId/comments", authRequired, addComment);
app.put("/api/comments/:id", authRequired, editComment);
app.delete("/api/comments/:id", authRequired, deleteComment);
app.get("/api/books/:bookId/comments", listComments);
app.put("/api/comments/:id/flag", authRequired, flagComment);
app.get("/api/admin/comments/flagged", authRequired, adminRequired, flaggedComments);
app.put("/api/comments/:id/unflag", authRequired, adminRequired, unflagComment);

/* ---- ANALYTICS ---- */
const { getAdminAnalytics, getPublicStats } = require("./src/services/analytics-service");
app.get("/api/admin/analytics", authRequired, adminRequired, getAdminAnalytics);
app.get("/api/stats", getPublicStats);

/* ---- READING PROGRESS ---- */
const { updateRoute: updateProgress, getRoute: getProgress, listRoute: listProgress, deleteRoute: deleteProgress } = require("./src/services/reading-progress-service");
app.post("/api/books/:bookId/progress", authRequired, updateProgress);
app.get("/api/books/:bookId/progress", authRequired, getProgress);
app.get("/api/reading-progress", authRequired, listProgress);
app.delete("/api/books/:bookId/progress", authRequired, deleteProgress);

/* ---- NEW PAGES ---- */
app.get("/notifications", (req, res) => servePage(req, res, "notifications"));
app.get("/notifications.html", (req, res) => servePage(req, res, "notifications"));
app.get("/bookmarks", (req, res) => servePage(req, res, "bookmarks"));
app.get("/bookmarks.html", (req, res) => servePage(req, res, "bookmarks"));
app.get("/wishlist", (req, res) => servePage(req, res, "wishlist"));
app.get("/wishlist.html", (req, res) => servePage(req, res, "wishlist"));
app.get("/analytics", (req, res) => servePage(req, res, "analytics"));
app.get("/analytics.html", (req, res) => servePage(req, res, "analytics"));
app.get("/tags", (req, res) => servePage(req, res, "tags"));
app.get("/tags.html", (req, res) => servePage(req, res, "tags"));


/* ---- AVATAR ROUTES ---- */
const { uploadAvatar, processAvatar, cropAvatar, deleteAvatar, getUserAvatar } = require("./src/services/avatar-service");
app.post("/api/user/avatar", authRequired, uploadAvatar, async (req, res) => {
  try {
    const result = await processAvatar(req.user.id, req.file);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'avatar_upload_failed', message: error.message });
  }
});
app.post("/api/user/avatar/crop", authRequired, uploadAvatar, async (req, res) => {
  try {
    const { x, y, width, height } = JSON.parse(req.body.cropData || '{}');
    const result = await cropAvatar(req.user.id, req.file, { x, y, width, height });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'avatar_crop_failed', message: error.message });
  }
});
app.delete("/api/user/avatar", authRequired, async (req, res) => {
  try {
    const result = await deleteAvatar(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'avatar_delete_failed', message: error.message });
  }
});
app.get("/api/user/:userId/avatar", async (req, res) => {
  try {
    const avatar = getUserAvatar(req.params.userId);
    res.json(avatar || { avatarUrl: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ---- LOANS ROUTES ---- */
const { createLoan, returnBook, renewLoan, listUserLoans, getLoanDetails, getOverdueLoans, updateOverdueStatus } = require("./src/services/loans-service");
app.post("/api/books/:bookId/loan", authRequired, createLoan);
app.post("/api/loans/:loanId/return", authRequired, returnBook);
app.post("/api/loans/:loanId/renew", authRequired, renewLoan);
app.get("/api/loans", authRequired, listUserLoans);
app.get("/api/loans/:loanId", authRequired, getLoanDetails);
app.get("/api/admin/loans/overdue", authRequired, adminRequired, getOverdueLoans);

/* ---- ENHANCED HEALTH CHECK ---- */
const { healthCheck } = require("./scripts/health.js");
app.get("/api/health/detailed", async (req, res) => {
  try {
    const health = await healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({ status: 'error', message: error.message });
  }
});

/* ---- LOGGING MIDDLEWARE ---- */
const { logger } = require("./src/config/logger");
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      });
    }
  });
  next();
});

// Aggiorna status prestiti in ritardo ogni ora
setInterval(async () => {
  try {
    await updateOverdueStatus();
  } catch (e) {
    logger.error('Failed to update overdue status', { error: e.message });
  }
}, 3600000);

/* ---- EXPORT ROUTES ---- */
const { handleExportUserCSV, handleExportBooksCSV, handleExportStats } = require("./src/services/export-service");
app.get("/api/export/user/csv", authRequired, handleExportUserCSV);
app.get("/api/export/books/csv", handleExportBooksCSV);
app.get("/api/admin/export/stats", authRequired, adminRequired, handleExportStats);

/* ---- SSE NOTIFICATIONS ---- */
const { handleSSE } = require("./src/services/notifications-realtime");
app.get("/api/notifications/stream", authRequired, handleSSE);

/* ---- ANALYTICS ENHANCED ---- */
const analyticsService = require("./src/services/analytics-service");
app.get("/api/analytics/books-by-category", async (req, res) => {
  try {
    const db = require("./src/database/connection").getDb();
    const data = db.prepare(`
      SELECT c.name_key as category, COUNT(b.id) as count
      FROM categories c LEFT JOIN books b ON c.id = b.category_id
      GROUP BY c.id ORDER BY count DESC
    `).all();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/analytics/books-by-format", async (req, res) => {
  try {
    const db = require("./src/database/connection").getDb();
    const data = db.prepare('SELECT file_format as format, COUNT(*) as count FROM books GROUP BY file_format ORDER BY count DESC').all();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/analytics/user-activity", authRequired, adminRequired, async (req, res) => {
  try {
    const db = require("./src/database/connection").getDb();
    const data = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users WHERE created_at >= DATE('now', '-30 days')
      GROUP BY DATE(created_at) ORDER BY date
    `).all();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/analytics/loan-stats", authRequired, adminRequired, async (req, res) => {
  try {
    const db = require("./src/database/connection").getDb();
    const stats = {
      total: db.prepare('SELECT COUNT(*) as c FROM loans').get().c,
      active: db.prepare("SELECT COUNT(*) as c FROM loans WHERE status = 'active'").get().c,
      overdue: db.prepare("SELECT COUNT(*) as c FROM loans WHERE status = 'overdue'").get().c,
      returned: db.prepare("SELECT COUNT(*) as c FROM loans WHERE status = 'returned'").get().c,
      byMonth: db.prepare(`
        SELECT strftime('%Y-%m', loaned_at) as month, COUNT(*) as count
        FROM loans GROUP BY month ORDER BY month DESC LIMIT 12
      `).all()
    };
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
  logger.info('Server started', { port: 3000, env: process.env.NODE_ENV || 'development' });
  // Aggiorna prestiti in ritardo all'avvio
  updateOverdueStatus().catch(() => {});
});