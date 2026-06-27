import pathlib

p = pathlib.Path('server.js')
c = p.read_text(encoding='utf-8')

# Fix the broken try block in upload route - the if condition was lost
old = """const { title, author, description, color } = req.body;
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Title and author are required' });
    }
    const ext = path.extname(req.file.originalname).toLowerCase();"""

new = """const { title, author, description, color } = req.body;
    if (!title || !author) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Title and author are required' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const ext = path.extname(req.file.originalname).toLowerCase();"""

print('old found:', old in c)
if old in c:
    c = c.replace(old, new, 1)
    p.write_text(c, encoding='utf-8')
    print('Fixed')
else:
    idx = c.find("fs.unlinkSync(req.file.path);")
    print('unlink at:', idx)
    if idx >= 0:
        print(repr(c[idx-80:idx+100]))
