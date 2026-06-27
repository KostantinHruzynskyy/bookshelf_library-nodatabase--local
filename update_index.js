const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// Add Dashboard link to user links section
content = content.replace(
  '<span id="userName" class="user-name"></span>\n    <a href="#" id="logoutBtn" class="btn-auth">Logout</a>',
  '<span id="userName" class="user-name"></span>\n    <a href="/dashboard.html" class="btn-auth">Dashboard</a>\n    <a href="#" id="logoutBtn" class="btn-auth">Logout</a>'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('index.html updated!');