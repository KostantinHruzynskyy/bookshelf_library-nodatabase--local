
document.addEventListener("DOMContentLoaded", () => {
  loadWishlist();
  setupAuth();
});

async function loadWishlist() {
  const grid = document.getElementById("wishlistGrid");
  const empty = document.getElementById("emptyState");
  try {
    const res = await fetch("/api/wishlist");
    if (!res.ok) throw new Error("Not logged in");
    const items = await res.json();
    if (items.length === 0) {
      if (grid) grid.style.display = "none";
      if (empty) empty.style.display = "block";
      return;
    }
    if (grid) {
      grid.style.display = "grid";
      grid.innerHTML = items.map(b => `
        <div class="book-card">
          <div class="book-cover" style="background:${b.color||'#5d4037'}">
            <span class="format-icon">${b.formatIcon||'📚'}</span>
          </div>
          <div class="book-info">
            <h3>${b.title}</h3>
            <p class="author">${b.author||'Unknown'}</p>
          </div>
          <div class="book-actions">
            <button class="btn-read" onclick="window.location.href='/reader.html?id=${b.book_id||b.id}'">📖 Read</button>
            <button class="btn-bookmark active" onclick="removeWishlist(${b.book_id||b.id})">⭐</button>
          </div>
        </div>`).join("");
    }
    if (empty) empty.style.display = "none";
  } catch (e) {
    if (grid) grid.style.display = "none";
    if (empty) { empty.style.display = "block"; empty.innerHTML = '<div class="icon">🔒</div><h2>Please login</h2><a href="/login.html" class="btn">Login</a>'; }
  }
}

async function removeWishlist(id) {
  await fetch(`/api/books/${id}/wishlist`, {method:"DELETE"});
  loadWishlist();
}

function setupAuth() {
  fetch("/api/auth/me").then(r=>r.json()).then(d=>{
    if(d.ok&&d.user){
      const al=document.getElementById("authLinks");
      const ul=document.getElementById("userLinks");
      const un=document.getElementById("userName");
      if(al) al.style.display="none";
      if(ul) ul.style.display="flex";
      if(un) un.textContent="👤 "+d.user.username;
    }
  }).catch(()=>{});
  const lb=document.getElementById("logoutBtn");
  if(lb) lb.addEventListener("click",async()=>{
    await fetch("/api/auth/logout",{method:"POST"});
    window.location.href="/";
  });
}
