const fs = require('fs');
const path = require('path');

const gitignorePath = path.join(__dirname, '.gitignore');

const content = `# Dependencies
node_modules/

# Logs
*.log
logs/

# Environment files - NEVER commit these!
.env
.env.local
.env.production
.env.*.local

# Database files
*.db
*.db-shm
*.db-wal
data/

# Backups
backups/

# User uploads
uploads/
books/

# OS files
.DS_Store
Thumbs.db

# IDE settings
.vscode/
.idea/

# Sensitive documentation
admin.md
*.key
*.pem
*.cert
secrets/

# Test coverage
coverage/

# Temporary files
tmp/
temp/

# Build output
dist/
build/
`;

fs.writeFileSync(gitignorePath, content, 'utf8');
console.log('.gitignore updated successfully!');