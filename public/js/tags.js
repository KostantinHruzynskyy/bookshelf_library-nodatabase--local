
document.addEventListener("DOMContentLoaded", () => {
  loadTags();
  setupAuth();
});

async function loadTags() {
  const container = document.getElementById("tagsGrid");
  try {
    const res = await fetch("/api/tags");
    if (!res.ok) throw new Error("Failed");
    const tags = await res.json();
    if (tags.length === 0) {
      container.innerHTML = "<p>No tags found</p>";
      return;
    }
    container.innerHTML = tags.map(t => `
      <a href="/books.html?tag=${t.name}" class="tag-card" style="border-color:${t.color||'#8b4513'}">
        <span class="tag-icon">🏷️</span>
        <span class="tag-name">${t.name}</span>
        <span class="tag-count">${t.count||0} books</span>
      </a>`).join("");
  } catch (e) {
    container.innerHTML = "<p>Error loading tags</p>";
  }
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
