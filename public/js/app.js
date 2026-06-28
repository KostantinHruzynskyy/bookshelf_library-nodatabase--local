let books = [];
let currentBook = null;

const library = document.getElementById("library");
const modal = document.getElementById("modal");
const mTitle = document.getElementById("mTitle");
const mAuthor = document.getElementById("mAuthor");
const mDesc = document.getElementById("mDesc");
const readBtn = document.getElementById("readBtn");
const searchInput = document.getElementById("search");
const countEl = document.getElementById("bookCount");

document.addEventListener("DOMContentLoaded", function() {
  fetchBooks();
  setupEventListeners();
  updateAuthUI();
});

async function fetchBooks() {
  try {
    const res = await fetch("/api/books");
    books = await res.json();
    renderBooks(books);
  } catch (err) {
    if (library) {
      library.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="icon">❌</div><h2>Failed to load books</h2></div>';
    }
  }
}

/* RENDER SHELVES */
function renderBooks(data) {
  library.innerHTML = "";

  if (data.length === 0) {
    library.innerHTML = `
      <div class="empty-library">
        <div class="empty-icon">📚</div>
        <h2>Your bookshelf is empty</h2>
        <p>Go to the <a href="/admin.html">Admin Panel</a> to add your first book!</p>
      </div>`;
    if (countEl) countEl.textContent = "0 books";
    return;
  }

  if (countEl) countEl.textContent = `${data.length} book${data.length !== 1 ? "s" : ""}`;

  const SHELF_SIZE = 6;
  for (let i = 0; i < data.length; i += SHELF_SIZE) {
    const shelf = document.createElement("div");
    shelf.className = "shelf";

    const shelfLabel = document.createElement("div");
    shelfLabel.className = "shelf-label";
    shelfLabel.textContent = `Shelf ${Math.floor(i / SHELF_SIZE) + 1}`;
    shelf.appendChild(shelfLabel);

    const booksSlice = data.slice(i, i + SHELF_SIZE);
    booksSlice.forEach(book => {
      const el = document.createElement("div");
      el.className = "book";
      el.style.background = book.color || "#8B4513";

      const formatIcon = book.formatIcon || "📄";
      const formatLabel = book.formatLabel || "TXT";

      el.innerHTML = `
        <div class="book-spine">
          <span class="book-format-icon">${formatIcon}</span>
          <span class="book-title">${escapeHtml(book.title)}</span>
          <span class="book-author">${escapeHtml(book.author)}</span>
          <span class="book-format-badge">${escapeHtml(formatLabel)}</span>
        </div>
      `;
      el.onclick = () => openModal(book);
      shelf.appendChild(el);
    });

    library.appendChild(shelf);
  }
}

/* MODAL */
let currentBook = null;

function openModal(book) {
  currentBook = book;
  modal.style.display = "flex";
  mTitle.textContent = book.title;
  mAuthor.textContent = "by " + book.author;
  mDesc.textContent = book.description || "No description available.";

  /* Show format info in modal */
  const formatInfo = book.formatLabel ? ` · ${book.formatIcon || "📄"} ${book.formatLabel}` : "";
  mAuthor.textContent = "by " + book.author + formatInfo;

  readBtn.onclick = () => {
    let url = `/reader.html?title=${encodeURIComponent(book.title)}&file=${encodeURIComponent(book.file)}`;
    if (book.id) url += `&id=${book.id}`;
    window.location.href = url;
  };
}

function closeModal() {
  modal.style.display = "none";
  currentBook = null;
}

function setupEventListeners() {
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }
  
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
  
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      const term = e.target.value.toLowerCase();
      const filtered = books.filter(b =>
        b.title.toLowerCase().includes(term) ||
        b.author.toLowerCase().includes(term) ||
        (b.description && b.description.toLowerCase().includes(term))
      );
      renderBooks(filtered);
    });
  }
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
      } catch (err) {
        console.error("Logout failed:", err);
      }
    });
  }
}

async function updateAuthUI() {
  try {
    const res = await fetch('/api/auth/me');
    const data = res.ok ? await res.json() : null;
    
    const authLinks = document.getElementById('authLinks');
    const userLinks = document.getElementById('userLinks');
    const navLogin = document.getElementById('navLogin');
    const navRegister = document.getElementById('navRegister');
    const navDashboard = document.getElementById('navDashboard');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (data && data.ok) {
      if (authLinks) authLinks.style.display = 'none';
      if (userLinks) userLinks.style.display = 'inline-flex';
      if (navLogin) navLogin.style.display = 'none';
      if (navRegister) navRegister.style.display = 'none';
      if (navDashboard) navDashboard.style.display = 'inline-flex';
      if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    } else {
      if (authLinks) authLinks.style.display = 'inline-flex';
      if (userLinks) userLinks.style.display = 'none';
      if (navLogin) navLogin.style.display = 'inline-flex';
      if (navRegister) navRegister.style.display = 'inline-flex';
      if (navDashboard) navDashboard.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
    }
  } catch (err) {
    console.error("Auth check failed:", err);
  }
}

/* UTILITY */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}