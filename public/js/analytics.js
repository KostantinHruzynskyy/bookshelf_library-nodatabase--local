
document.addEventListener("DOMContentLoaded", () => {
  loadStats();
  setupAuth();
});

async function loadStats() {
  try {
    const res = await fetch("/api/stats");
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    const stats = data.stats || {};
    document.getElementById("statBooks").textContent = stats.totalBooks || 0;
    document.getElementById("statUsers").textContent = stats.totalUsers || 0;
    document.getElementById("statDownloads").textContent = stats.totalDownloads || 0;
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
