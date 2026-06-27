import pathlib

p = pathlib.Path('public/admin.html')
c = p.read_text(encoding='utf-8')

# Replace all .then(r => r.json()) with auth-aware version
old1 = """.then(r => r.json())
    .then(data => {
      showToast('Book added successfully!', 'success');
      resetForm();
      loadBooks();
    })
    .catch(() => showToast('Error adding book', 'error'));"""

new1 = """.then(function(r) { if (r.status === 401) { showToast('Login required! Please log in.', 'error'); return null; } return r.json(); })
    .then(function(data) { if (data) { showToast('Book added successfully!', 'success'); resetForm(); loadBooks(); } })
    .catch(function() { showToast('Error adding book', 'error'); });"""

if old1 in c:
    c = c.replace(old1, new1, 1)
    print('patched form submit')
else:
    print('form submit not found')

# Patch file upload handler
old2 = """.then(r => r.json())
    .then(data => {
      showToast('File uploaded successfully!', 'success');
      resetForm();
      loadBooks();
    })
    .catch(() => showToast('Error uploading file', 'error'));"""

new2 = """.then(function(r) { if (r.status === 401) { showToast('Login required! Please log in.', 'error'); return null; } return r.json(); })
    .then(function(data) { if (data) { showToast('File uploaded successfully!', 'success'); resetForm(); loadBooks(); } })
    .catch(function() { showToast('Error uploading file', 'error'); });"""

if old2 in c:
    c = c.replace(old2, new2, 1)
    print('patched file upload')
else:
    print('file upload not found')

p.write_text(c, encoding='utf-8')
print('done')
