const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
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

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});