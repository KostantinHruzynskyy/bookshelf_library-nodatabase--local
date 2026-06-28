// Bookshelf Library - Main JavaScript
let books = [];
let currentBook = null;
let bookmarks = [];

document.addEventListener('DOMContentLoaded', () => {
  initPage();
});

async function initPage() {
  updateAuthUI();
  await fetchBooks();
  setupEventListeners();
  loadBookmarks();
}

async function fetchBooks() {
  const grid = document.getElementById('booksGrid');
  const empty = document.getElementById('emptyState');
  
  try {
    const res = await fetch('/api/books');
    if (!res.ok) throw new Error('Failed to fetch');
    books = await res.json();
    
    if (books.length === 0) {
      if (grid) grid.style.display = 'none';
      if (empty) empty.style.display = 'block';
    } else {
      if (grid) grid.style.display = 'grid';
      if (empty) empty.style.display = 'none';
      renderBooks(books);
    }
  } catch (err) {
    console.error('Error fetching books:', err);
    if (grid) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="icon">❌</div><h2>Failed to load books</h2></div>';
    }
  }
}

function renderBooks(data) {
  const grid = document.getElementById('booksGrid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  data.forEach(book => {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.dataset.format = book.file_format || book.format || '.txt';
    
    const formatIcon = book.formatIcon || getFormatIcon(book.file_format || book.format);
    const formatLabel = book.formatLabel || getFormatLabel(book.file_format || book.format);
    const isBookmarked = bookmarks.includes(book.id);
    
    card.innerHTML = `
      <div class="book-cover" style="background: ${book.color || '#5d4037'}">
        <span class="format-icon">${formatIcon}</span>
        <span class="format-badge">${formatLabel}</span>
      </div>
      <div class="book-info">
        <h3>${escapeHtml(book.title)}</h3>
        <p class="author">${escapeHtml(book.author || 'Unknown Author')}</p>
        <div class="meta">
          <span>${formatDate(book.created_at)}</span>
          <span class="downloads">⬇️ ${book.downloads || 0}</span>
        </div>
      </div>
      <div class="book-actions">
        <button class="btn-read" onclick="openBook(${book.id})">📖 Read</button>
        <button class="btn-download" onclick="downloadBook(${book.id})">⬇️</button>
// Bookmarks
async function loadBookmarks() {
  try {
    const res = await fetch('/api/bookmarks');
    if (res.ok) {
      const data = await res.json();
      bookmarks = data.map(b => b.book_id || b.id);
    }
  } catch (e) {}
}

async function toggleBookmark(bookId) {
  try {
    const isBookmarked = bookmarks.includes(bookId);
    const method = isBookmarked ? 'DELETE' : 'POST';
    const res = await fetch(`/api/books/${bookId}/bookmark`, { method });
    if (res.ok) {
      if (isBookmarked) bookmarks = bookmarks.filter(id => id !== bookId);
      else bookmarks.push(bookId);
      renderBooks(books);
    }
  } catch (e) {
    alert('Please login to bookmark books');
  }
}

// Open Book Modal
function openBook(bookId) {
  currentBook = books.find(b => b.id === bookId);
  if (!currentBook) return;
  
  const modal = document.getElementById('bookModal');
  const title = document.getElementById('modalTitle');
  const author = document.getElementById('modalAuthor');
  const desc = document.getElementById('modalDesc');
  const format = document.getElementById('modalFormat');
  const size = document.getElementById('modalSize');
  const downloads = document.getElementById('modalDownloads');
  const date = document.getElementById('modalDate');
  const readBtn = document.getElementById('modalRead');
  const downloadBtn = document.getElementById('modalDownload');
  
  if (title) title.textContent = currentBook.title;
  if (author) author.textContent = `by ${currentBook.author || 'Unknown Author'}`;
  if (desc) desc.textContent = currentBook.description || 'No description available.';
  if (format) format.textContent = `📄 ${currentBook.formatLabel || currentBook.file_format}`;
  if (size) size.textContent = `💾 ${formatFileSize(currentBook.file_size)}`;
  if (downloads) downloads.textContent = `⬇️ ${currentBook.downloads || 0} downloads`;
  if (date) date.textContent = `📅 ${formatDate(currentBook.created_at)}`;
  if (readBtn) readBtn.href = `/reader.html?id=${bookId}`;
  if (downloadBtn) downloadBtn.href = `/api/books/${bookId}/download`;
  if (modal) modal.classList.add('active');
// Search & Filter
function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const filterBtns = document.querySelectorAll('.filter-btn');
  
  if (searchInput) searchInput.addEventListener('input', debounce(searchBooks, 300));
  if (searchBtn) searchBtn.addEventListener('click', searchBooks);
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterBooks(btn.dataset.filter);
    });
  });
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  
  const modal = document.getElementById('bookModal');
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}

async function searchBooks() {
  const input = document.getElementById('searchInput');
  const query = input?.value?.trim();
  if (!query) { renderBooks(books); return; }
  
  try {
    const res = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
    const results = await res.json();
    renderBooks(results);
  } catch (e) { console.error('Search error:', e); }
}

function filterBooks(filter) {
  if (filter === 'all') { renderBooks(books); return; }
  const filtered = books.filter(b => {
    const format = (b.file_format || b.format || '').toLowerCase();
    return format === filter.toLowerCase().replace('.', '');
  });
  renderBooks(filtered);
}

// Auth
async function updateAuthUI() {
  try {
    const res = await fetch('/api/auth/me');
    const authLinks = document.getElementById('authLinks');
    const userLinks = document.getElementById('userLinks');
    const userName = document.getElementById('userName');
    
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.user) {
        if (authLinks) authLinks.style.display = 'none';
        if (userLinks) userLinks.style.display = 'flex';
// Utilities
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFormatIcon(format) {
  const icons = {
    '.pdf': '📕', '.epub': '📗', '.mobi': '📘', '.txt': '📄',
    '.doc': '📘', '.docx': '📘', '.html': '🌐', '.htm': '🌐',
    '.md': '📝', '.rtf': '📄', '.odt': '📄', '.fb2': '📖',
    '.azw': '📱', '.azw3': '📱', '.djvu': '📑', '.cbz': '💬', '.cbr': '💬'
  };
  return icons[format?.toLowerCase()] || '📚';
}

function getFormatLabel(format) {
  const labels = {
    '.pdf': 'PDF', '.epub': 'EPUB', '.mobi': 'MOBI', '.txt': 'Text',
    '.doc': 'Word', '.docx': 'Word', '.html': 'HTML', '.htm': 'HTML',
    '.md': 'Markdown', '.rtf': 'RTF', '.odt': 'OpenDoc', '.fb2': 'FictionBook',
    '.azw': 'Kindle', '.azw3': 'Kindle', '.djvu': 'DjVu', '.cbz': 'Comic', '.cbr': 'Comic'
  };
  return labels[format?.toLowerCase()] || format?.replace('.', '').toUpperCase() || 'Book';
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
        if (userName) {
          userName.textContent = `👤 ${data.user.username}`;
          userName.href = '/profile.html';
        }
      }
    }
  } catch (e) {}
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  } catch (e) {}
}
}

function closeModal() {
  const modal = document.getElementById('bookModal');
  if (modal) modal.classList.remove('active');
}

function downloadBook(bookId) {
  window.location.href = `/api/books/${bookId}/download`;
}
        <button class="btn-bookmark ${isBookmarked ? 'active' : ''}" onclick="toggleBookmark(${book.id})">🔖</button>
      </div>
    `;
    
    grid.appendChild(card);
  });
}
