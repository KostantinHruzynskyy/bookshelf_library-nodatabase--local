import pathlib

p = pathlib.Path('server.js')
c = p.read_text(encoding='utf-8')

start_marker = '/* ---- API ROUTES ---- */'
end_marker = '/* error handler for multer */'

start_idx = c.find(start_marker)
end_idx = c.find(end_marker)
print(f'start={start_idx} end={end_idx}')
assert start_idx > 0 and end_idx > 0

before = c[:start_idx]
after = c[end_idx:]

new_api = """/* ---- BOOK ROUTES (SQLite via repository) ---- */

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

"""

c = before + new_api + after
p.write_text(c, encoding='utf-8')
print(f'Done. Length: {len(c)}')
