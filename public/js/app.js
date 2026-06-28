// Bookshelf Library - Main JavaScript
console.log('App.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded');
  await loadBooks();
  setupAuth();
});

async function loadBooks() {
  const grid = document.getElementById('booksGrid');
  if (!grid) { console.log('No booksGrid found'); return; }
  
  try {
    const res = await fetch('/api/books');
    const books = await res.json();
    console.log('Books fetched:', books.length);
    
    if (books.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="icon">📚</div><h2>No books yet</h2></div>';
      return;
    }
    
    grid.innerHTML = books.map(book => `
      <div class="book-card">
        <div class="book-cover" style="background: ${book.color || '#5d4037'}">
          <span class="format-icon">${book.formatIcon || '📚'}</span>
          <span class="format-badge">${book.formatLabel || book.format || 'Book'}</span>
        </div>
        <div class="book-info">
          <h3>${book.title}</h3>
          <p class="author">${book.author || 'Unknown'}</p>
        </div>
        <div class="book-actions">
          <button class="btn-read" onclick="window.location.href='/reader.html?id=${book.id}'">📖 Read</button>
          <button class="btn-download" onclick="window.location.href='/api/books/${book.id}/file'">⬇️</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error:', err);
    grid.innerHTML = '<div class="empty-state"><h2>Error loading books</h2></div>';
  }
}

function setupAuth() {
  fetch('/api/auth/me').then(r=>r.json()).then(d=>{
    if(d.ok&&d.user){
      const al=document.getElementById('authLinks');
      const ul=document.getElementById('userLinks');
      const un=document.getElementById('userName');
      if(al) al.style.display='none';
      if(ul) ul.style.display='flex';
      if(un) un.textContent='👤 '+d.user.username;
    }
  }).catch(()=>{});
  const lb=document.getElementById('logoutBtn');
  if(lb) lb.addEventListener('click',async()=>{
    await fetch('/api/auth/logout',{method:'POST'});
    window.location.href='/';
  });
}
