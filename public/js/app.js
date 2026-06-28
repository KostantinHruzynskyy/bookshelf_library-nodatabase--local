// Bookshelf Library - Main JavaScript
let allBooks = [];
let currentBookmarks = [];

document.addEventListener("DOMContentLoaded", async () => {
  setupAuth();
  await loadBookmarks();
  await loadBooks();
  setupSearch();
  setupFilters();
});

async function loadBooks() {
  const grid = document.getElementById("booksGrid");
  if (!grid) return;
  try {
    const res = await fetch("/api/books");
    allBooks = await res.json();
    renderBooks(allBooks);
  } catch (err) {
    grid.innerHTML = "<div class=\"empty-state\"><h2>Error</h2></div>";
  }
}

function renderBooks(books) {
  const grid = document.getElementById("booksGrid");
  const empty = document.getElementById("emptyState");
  if (!grid) return;
  if (!books || books.length === 0) {
    grid.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";
  grid.innerHTML = books.map(book => {
    const isBookmarked = currentBookmarks.includes(book.id);
    return "<div class=\"book-card\">" +
      "<div class=\"book-cover\" style=\"background:" + (book.color || "#5d4037") + "\">" +
        "<span class=\"format-icon\">" + (book.formatIcon || "📚") + "</span>" +
        "<span class=\"format-badge\">" + (book.formatLabel || "Book") + "</span>" +
      "</div>" +
      "<div class=\"book-info\">" +
        "<h3>" + book.title + "</h3>" +
        "<p class=\"author\">" + (book.author || "Unknown") + "</p>" +
      "</div>" +
      "<div class=\"book-actions\">" +
        "<button class=\"btn-read\" onclick=\"window.location.href='/reader.html?id=" + book.id + "'\">📖</button>" +
        "<button class=\"btn-download\" onclick=\"window.location.href='/api/books/" + book.id + "/file'\">⬇️</button>" +
        "<button class=\"btn-bookmark " + (isBookmarked ? "active" : "") + "\" onclick=\"toggleBookmark(" + book.id + ")\">🔖</button>" +
      "</div>" +
    "</div>";
  }).join("");
}
// ==================== SEARCH ====================
function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  if (searchInput) searchInput.addEventListener("input", debounce(performSearch, 300));
  if (searchBtn) searchBtn.addEventListener("click", performSearch);
}

function performSearch() {
  const searchInput = document.getElementById("searchInput");
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  if (!query) { renderBooks(allBooks); return; }
  const filtered = allBooks.filter(book => 
    book.title.toLowerCase().includes(query) ||
    (book.author && book.author.toLowerCase().includes(query)) ||
    (book.description && book.description.toLowerCase().includes(query))
  );
  renderBooks(filtered);
}

// ==================== FILTERS ====================
function setupFilters() {
  const filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filterBooks(btn.dataset.filter);
    });
  });
}

function filterBooks(filter) {
  if (filter === "all") { renderBooks(allBooks); return; }
  const format = filter.replace(".", "");
  const filtered = allBooks.filter(book => {
    const bookFormat = (book.format || "").replace(".", "").toLowerCase();
    return bookFormat === format.toLowerCase();
  });
  renderBooks(filtered);
}

// ==================== BOOKMARKS ====================
async function loadBookmarks() {
  try {
    const res = await fetch("/api/bookmarks");
    if (res.ok) {
      const bookmarks = await res.json();
      currentBookmarks = bookmarks.map(b => b.book_id || b.id);
    }
  } catch (e) {}
}

async function toggleBookmark(bookId) {
  try {
    const isBookmarked = currentBookmarks.includes(bookId);
    const method = isBookmarked ? "DELETE" : "POST";
    const res = await fetch("/api/books/" + bookId + "/bookmark", { method });
    if (res.ok) {
      if (isBookmarked) currentBookmarks = currentBookmarks.filter(id => id !== bookId);
      else currentBookmarks.push(bookId);
      renderBooks(allBooks);
    }
  } catch (e) { alert("Please login"); }
}

// ==================== AUTH ====================
function setupAuth() {
  fetch("/api/auth/me").then(r=>r.json()).then(data=>{
    if(data.ok && data.user){
      const al=document.getElementById("authLinks");
      const ul=document.getElementById("userLinks");
      const un=document.getElementById("userName");
      if(al) al.style.display="none";
      if(ul) ul.style.display="flex";
      if(un) un.textContent="👤 "+data.user.username;
    }
  }).catch(()=>{});
  const lb=document.getElementById("logoutBtn");
  if(lb) lb.addEventListener("click",async()=>{
    await fetch("/api/auth/logout",{method:"POST"});
    window.location.href="/";
  });
}

// ==================== UTILITIES ====================
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}