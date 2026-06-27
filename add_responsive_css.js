const fs = require('fs');
const path = require('path');
const cssPath = path.join(__dirname, 'public', 'style.css');
let css = fs.readFileSync(cssPath, 'utf8');

const responsive = `

/* RESPONSIVE */
@media (max-width: 768px) {
  .topbar { padding: 20px 12px 14px; }
  .topbar h1 { font-size: 1.5rem; }
  .topbar input[type="text"] { width: min(350px, 88vw); padding: 10px 14px; }
  .btn-admin, .btn-auth { padding: 8px 12px; font-size: 0.8rem; }
  #library { padding: 15px 12px 40px; gap: 35px; }
  .shelf { gap: 8px; padding: 16px 10px 28px; overflow-x: auto; }
  .book { width: 75px; height: 125px; }
  .book-title { font-size: 0.6rem; }
  .modal-card { width: min(380px, 90vw); padding: 24px; margin: 20px; }
  .modal-actions { flex-direction: column; gap: 8px; }
  .modal-actions button { width: 100%; }
}

@media (max-width: 480px) {
  .topbar h1 { font-size: 1.3rem; }
  .topbar input[type="text"] { width: 100%; max-width: 280px; padding: 9px 12px; }
  .btn-admin { padding: 7px 10px; font-size: 0.75rem; }
  #library { padding: 10px 8px 30px; gap: 28px; }
  .shelf { gap: 6px; padding: 14px 8px 24px; }
  .book { width: 62px; height: 105px; }
  .book-title { font-size: 0.52rem; }
  .book-format-badge { display: none; }
  .modal-card { width: 95vw; padding: 20px; margin: 10px; }
  .btn-auth { padding: 7px 10px; font-size: 0.78rem; }
}

@media (max-width: 320px) {
  .topbar h1 { font-size: 1.1rem; }
  .book { width: 54px; height: 90px; }
  #library { padding: 8px 6px 25px; }
  .shelf { gap: 5px; padding: 12px 6px 20px; }
}

@media (hover: none) and (pointer: coarse) {
  .btn-admin:hover, .btn-auth:hover, .book:hover { transform: none; }
  .book:active { transform: scale(0.96); }
  .btn-admin, .btn-auth, .btn-submit { min-height: 44px; }
  input[type="text"], input[type="email"], input[type="password"] { font-size: 16px; }
}

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}

@media print {
  .topbar { position: static; background: #fff; color: #000; }
  .btn-admin, .btn-auth, .controls { display: none; }
  .shelf, .book { break-inside: avoid; }
  .modal { display: none !important; }
}

.container { max-width: 900px; margin: 0 auto; padding: 24px 16px 60px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; flex-wrap: wrap; gap: 12px; }
.header h1 { font-size: clamp(1.4rem, 4vw, 1.8rem); color: #f0e6d6; }
.btn-back { padding: 10px 16px; border-radius: 10px; border: 1px solid rgba(139,90,43,0.4); background: rgba(139,90,43,0.15); color: #d4a574; text-decoration: none; font-size: 0.85rem; font-weight: 600; }
.loading { text-align: center; padding: 60px 20px; color: #7a6a5a; font-size: 1.1rem; }
.error { background: rgba(220,50,50,0.15); border: 1px solid rgba(220,50,50,0.3); color: #ff8a80; padding: 14px 18px; border-radius: 10px; margin-bottom: 20px; display: none; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px; margin-bottom: 24px; }
.stat-card { background: linear-gradient(160deg, #2a2218, #1e1812); border: 1px solid rgba(139,90,43,0.2); border-radius: 14px; padding: 20px; text-align: center; }
.stat-card .icon { font-size: 2rem; margin-bottom: 6px; }
.stat-card .value { font-size: 1.6rem; font-weight: 700; color: #c8956c; }
.stat-card .label { font-size: 0.75rem; color: #a08870; text-transform: uppercase; letter-spacing: 1px; }
.card { background: linear-gradient(160deg, #2a2218, #1e1812); border: 1px solid rgba(139,90,43,0.2); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
.card h2 { font-size: 1.1rem; color: #c8956c; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid rgba(139,90,43,0.15); }
.profile-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; }
.field label { display: block; font-size: 0.7rem; color: #a08870; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
.field .value { font-size: 0.95rem; color: #e8e0d4; word-break: break-word; }
.btn-upload { display: inline-block; padding: 12px 20px; border-radius: 10px; background: linear-gradient(135deg, #c8956c, #a06830); color: #fff; text-decoration: none; font-weight: 600; margin-top: 16px; }
.book-list { list-style: none; }
.book-item { display: flex; align-items: center; gap: 12px; padding: 14px; border: 1px solid rgba(139,90,43,0.15); border-radius: 10px; margin-bottom: 10px; }
.book-dot { width: 44px; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0; }
.book-info { flex: 1; min-width: 0; }
.book-title { font-size: 0.95rem; font-weight: 600; color: #f0e6d6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.book-date { font-size: 0.78rem; color: #7a6a5a; }
.empty { text-align: center; padding: 40px 20px; color: #7a6a5a; }
.empty .icon { font-size: 2.5rem; margin-bottom: 10px; }

@media (max-width: 768px) {
  .header h1 { font-size: 1.3rem; }
  .btn-back { padding: 8px 12px; font-size: 0.8rem; }
  .stat-card { padding: 16px; }
  .profile-grid { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .container { padding: 16px 12px 40px; }
  .header { flex-direction: column; text-align: center; }
  .header h1 { font-size: 1.2rem; }
  .stats { grid-template-columns: 1fr 1fr; gap: 10px; }
  .btn-upload { width: 100%; text-align: center; }
}
`;

css += responsive;
fs.writeFileSync(cssPath, css, 'utf8');
console.log('✅ Responsive CSS added!');