let books = [];

const library = document.getElementById("library");
const modal = document.getElementById("modal");
const mTitle = document.getElementById("mTitle");
const mAuthor = document.getElementById("mAuthor");
const mDesc = document.getElementById("mDesc");
const readBtn = document.getElementById("readBtn");
const searchInput = document.getElementById("search");
const countEl = document.getElementById("bookCount");

/* FETCH BOOKS FROM API */
fetch("/api/books")
  .then(res => res.json())
  .then(data => {
    books = data;
    renderBooks(books);
  })
  .catch(() => {
    library.innerHTML = '<p class="empty-msg">Could not load books. Try adding some from the admin panel!</p>';
  });

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

    /* shelf label */
    const shelfLabel = document.createElement("div");
    shelfLabel.className = "shelf-label";
    shelfLabel.textContent = `Shelf ${Math.floor(i / SHELF_SIZE) + 1}`;
    shelf.appendChild(shelfLabel);

    const booksSlice = data.slice(i, i + SHELF_SIZE);
    booksSlice.forEach(book => {
      const el = document.createElement("div");
      el.className = "book";
      el.style.background = book.color || "#8B4513";
      el.innerHTML = `
        <div class="book-spine">
          <span class="book-title">${escapeHtml(book.title)}</span>
          <span class="book-author">${escapeHtml(book.author)}</span>
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

  readBtn.onclick = () => {
    window.location.href = `/books/reader.html?title=${encodeURIComponent(book.title)}&file=${encodeURIComponent(book.file)}`;
  };
}

function closeModal() {
  modal.style.display = "none";
  currentBook = null;
}

/* close modal on outside click */
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

/* close on Escape key */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

/* SEARCH */
searchInput.addEventListener("input", e => {
  const term = e.target.value.toLowerCase();
  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(term) ||
    b.author.toLowerCase().includes(term) ||
    (b.description && b.description.toLowerCase().includes(term))
  );
  renderBooks(filtered);
});

/* UTILITY */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}