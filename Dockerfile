# Multi-stage build per Bookshelf Library
FROM node:20-alpine AS builder

WORKDIR /app

# Copia package files
COPY package*.json ./

# Installa dipendenze
RUN npm ci --only=production

# Stage di produzione
FROM node:20-alpine AS production

# Crea utente non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

WORKDIR /app

# Copia dipendenze dal builder
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copia codice applicazione
COPY --chown=nodeuser:nodejs . .

# Crea directory necessarie
RUN mkdir -p storage/backups storage/uploads logs public/uploads/avatars && \
    chown -R nodeuser:nodejs /app

# Esponi porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node scripts/health.js || exit 1

# Cambia a utente non-root
USER nodeuser

# Avvia applicazione
CMD ["node", "server.js"]
# Multi-stage build for smaller image
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Production stage
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

WORKDIR /app

# Copy from builder
COPY --from=builder --chown=nodeuser:nodejs /app .

# Create directories for uploads and data
RUN mkdir -p uploads books data && \
    chown -R nodeuser:nodejs /app

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node scripts/health.js || exit 1

# Start application
CMD ["node", "server.js"]