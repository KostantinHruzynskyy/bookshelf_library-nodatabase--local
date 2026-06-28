
document.addEventListener("DOMContentLoaded", () => {
  loadStats();
  setupAuth();
});

async function loadStats() {
  try {
    const res = await fetch("/api/stats");
    if (!res.ok) throw new Error("Failed");
    const stats = await res.json();
    document.getElementById("statBooks").textContent = stats.books || 0;
    document.getElementById("statUsers").textContent = stats.users || 0;
    document.getElementById("statDownloads").textContent = stats.downloads || 0;
    document.getElementById("statLoans").textContent = stats.activeLoans || 0;
  } catch (e) {
    console.error("Error loading stats:", e);
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
