const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const BOOKS_FILE = path.join(__dirname, "books.json");
const BOOKS_DIR = path.join(__dirname, "books");

/* ensure folder exists */
if (!fs.existsSync(BOOKS_DIR)) {
  fs.mkdirSync(BOOKS_DIR, { recursive: true });
}

/* ensure books.json exists */
if (!fs.existsSync(BOOKS_FILE)) {
  fs.writeFileSync(BOOKS_FILE, "[]");
}

/* get books */
app.get("/api/books", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(BOOKS_FILE, "utf8"));
    res.json(data);
  } catch (e) {
    res.json([]);
  }
});

/* add book */
app.post("/api/books", (req, res) => {
  const { title, author, description, color, content } = req.body;

  if (!title || !author) {
    return res.status(400).json({ error: "Title and author are required" });
  }

  const safeName = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const filePath = `books/${safeName}.txt`;

  /* save file */
  fs.writeFileSync(path.join(__dirname, filePath), content || "");

  /* update JSON */
  const books = JSON.parse(fs.readFileSync(BOOKS_FILE, "utf8"));

  books.push({
    id: Date.now(),
    title,
    author,
    description: description || "",
    color: color || "#8B4513",
    file: filePath
  });

  fs.writeFileSync(BOOKS_FILE, JSON.stringify(books, null, 2));

  res.json({ success: true });
});

/* delete book */
app.delete("/api/books/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const books = JSON.parse(fs.readFileSync(BOOKS_FILE, "utf8"));
  const book = books.find(b => b.id === id);

  if (book) {
    /* remove text file */
    const filePath = path.join(__dirname, book.file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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

  /* update text file if content provided */
  if (content !== undefined) {
    fs.writeFileSync(path.join(__dirname, book.file), content);
  }

  /* update fields */
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

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});