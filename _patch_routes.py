import pathlib

p = pathlib.Path('server.js')
c = p.read_text(encoding='utf-8')

# Insert full book routes before the error handler
marker = '/* error handler for multer */'
idx = c.find(marker)
assert idx > 0

routes = """app.post('/api/books', (req, res) => {
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
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Title and author are required' });
    }
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

"""

c = c[:idx] + routes + c[idx:]
p.write_text(c, encoding='utf-8')
print(f'Done. Length: {len(c)}')
