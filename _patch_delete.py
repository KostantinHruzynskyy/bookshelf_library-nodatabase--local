import pathlib

p = pathlib.Path('public/admin.html')
c = p.read_text(encoding='utf-8')

old = """function deleteBook(id) {
  if (!confirm('Are you sure you want to delete this book?')) return;

  fetch(`/api/books/${id}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(() => {
      showToast('Book deleted!', 'success');
      loadBooks();
    })
    .catch(() => showToast('Error deleting book', 'error'));
}"""

new = """function deleteBook(id) {
  if (!confirm('Are you sure you want to delete this book?')) return;
  fetch('/api/books/' + id, { method: 'DELETE' })
    .then(function(r) { if (r.status === 401) { showToast('Login required!', 'error'); return null; } return r.json(); })
    .then(function(d) { if (d) { showToast('Book deleted!', 'success'); loadBooks(); } })
    .catch(function() { showToast('Error deleting book', 'error'); });
}"""

if old in c:
    c = c.replace(old, new, 1)
    p.write_text(c, encoding='utf-8')
    print('deleteBook patched')
else:
    print('not found')
