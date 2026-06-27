const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'public', 'style.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Replace the responsive section with comprehensive responsive styles
const oldResponsive = `/* ---- RESPONSIVE ---- */
@media (max-width: 700px) {
  .topbar h1 { font-size: 1.5rem; }
  #library { padding: 15px 16px 40px; gap: 40px; }
  .shelf { gap: 10px; padding: 16px 12px 30px; flex-wrap: wrap; }
  .book { width: 80px; height: 130px; }
  .book-title { font-size: 0.62rem; -webkit-line-clamp: 3; }
}`;

const newResponsive = `/* ---- RESPONSIVE DESIGN ---- */

/* Tablet and smaller */
@media (max-width: 768px) {
  .topbar {
    padding: 20px 12px 14px;
  }
  
  .topbar h1 { 
    font-size: 1.6rem; 
  }
  
  .topbar .subtitle {
    font-size: 0.85rem;
    margin-bottom: 12px;
  }
  
  .topbar .controls {
    gap: 8px;
  }
  
  .topbar input[type="text"] {
    width: min(350px, 85vw);
    padding: 10px 14px;
    font-size: 0.9rem;
  }
  
  #library { 
    padding: 15px 12px 40px; 
    gap: 35px; 
  }
  
  .shelf { 
    gap: 8px; 
    padding: 16px 10px 28px;
  }
  
  .shelf-label {
    font-size: 0.65rem;
  }
  
  .book { 
    width: 70px; 
    height: 115px; 
  }
  
  .book-title { 
    font-size: 0.58rem; 
    -webkit-line-clamp: 3;
  }
  
  .book-author {
    font-size: 0.52rem;
  }
  
  .book-format-badge {
    font-size: 0.45rem;
    padding: 1px 4px;
  }
  
  .modal-card {
    width: min(380px, 90vw);
    padding: 24px;
  }
  
  .modal-card h2 {
    font-size: 1.2rem;
  }
  
  .btn-admin,
  .btn-auth {
    padding: 8px 12px;
    font-size: 0.8rem;
  }
  
  .user-name {
    font-size: 0.8rem;
  }
}

/* Mobile */
@media (max-width: 480px) {
  .topbar h1 { 
    font-size: 1.3rem; 
  }
  
  .topbar .subtitle {
    font-size: 0.75rem;
  }
  
  .topbar input[type="text"] {
    width: 100%;
    max-width: 280px;
    padding: 9px 12px;
    font-size: 0.85rem;
  }
  
  .topbar .book-count {
    font-size: 0.75rem;
  }
  
  #library { 
    padding: 10px 8px 30px; 
    gap: 28px; 
  }
  
  .shelf { 
    gap: 6px; 
    padding: 14px 8px 24px;
  }
  
  .book { 
    width: 60px; 
    height: 100px; 
  }
  
  .book-spine {
    padding: 6px 4px;
  }
  
  .book-title { 
    font-size: 0.52rem; 
    -webkit-line-clamp: 2;
  }
  
  .book-author {
    font-size: 0.48rem;
  }
  
  .book-format-icon {
    font-size: 0.6rem;
  }
  
  .book-format-badge {
    display: none;
  }
  
  .modal-card {
    width: 95vw;
    padding: 20px;
    margin: 10px;
  }
  
  .modal-card h2 {
    font-size: 1.1rem;
  }
  
  .modal-card .modal-author {
    font-size: 0.82rem;
  }
  
  .modal-card .modal-desc {
    font-size: 0.82rem;
  }
  
  .modal-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .modal-actions button {
    width: 100%;
    padding: 12px;
  }
  
  .btn-admin,
  .btn-auth {
    padding: 7px 10px;
    font-size: 0.75rem;
  }
  
  #authLinks,
  #userLinks {
    gap: 6px;
  }
}

/* Large screens */
@media (min-width: 1200px) {
  #library {
    max-width: 1200px;
    padding: 30px 40px 80px;
  }
  
  .shelf {
    gap: 16px;
    padding: 24px 20px 40px;
  }
  
  .book {
    width: 110px;
    height: 180px;
  }
  
  .book-title {
    font-size: 0.78rem;
  }
}

/* Touch device optimizations */
@media (hover: none) and (pointer: coarse) {
  .btn-admin:hover,
  .btn-auth:hover,
  .btn-read:hover,
  .btn-close:hover {
    transform: none;
  }
  
  .book {
    cursor: pointer;
  }
  
  .book:active {
    transform: scale(0.98);
  }
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Dark mode is default, but add light mode support */
@media (prefers-color-scheme: light) {
  /* Keep dark theme - it's the brand */
}

/* Print styles */
@media print {
  .topbar {
    position: static;
    background: #fff;
    color: #000;
  }
  
  .btn-admin,
  .btn-auth,
  .controls {
    display: none;
  }
  
  .shelf {
    background: #8B4513;
    break-inside: avoid;
  }
  
  .book {
    break-inside: avoid;
  }
}`;

css = css.replace(oldResponsive, newResponsive);

// Add auth buttons CSS if not present
if (!css.includes('.btn-auth')) {
  css += `

/* ---- AUTH BUTTONS ---- */
.btn-auth { 
  display: inline-flex; 
  align-items: center; 
  gap: 4px; 
  padding: 10px 16px; 
  border-radius: 12px; 
  border: 1px solid rgba(139,90,43,0.4); 
  background: rgba(139,90,43,0.15); 
  color: #d4a574;
  text-decoration: none; 
  font-size: 0.85rem; 
  font-weight: 600; 
  transition: all 0.25s; 
}

.btn-auth:hover { 
  background: rgba(139,90,43,0.3); 
  color: #f0d0a0; 
}

.btn-auth-primary { 
  background: linear-gradient(135deg, #c8956c, #a06830); 
  color: #fff; 
  border: none; 
}

.btn-auth-primary:hover { 
  background: linear-gradient(135deg, #d4a574, #b87840); 
}

.user-name { 
  color: #c8956c; 
  font-size: 0.85rem; 
  font-weight: 600; 
}

#authLinks, #userLinks { 
  display: inline-flex; 
  align-items: center; 
  gap: 8px; 
}`;
}

fs.writeFileSync(cssPath, css, 'utf8');
console.log('✅ CSS updated with comprehensive responsive design!');