# 🚀 Bookshelf Library v2.0 - Nuove Funzionalità

## Panoramica

Questa documentazione descrive le nuove funzionalità aggiunte nella versione 2.0.

---

## 📧 1. Sistema Email con Nodemailer

### Configurazione

**Sviluppo (Ethereal):**
```env
ETHEREAL_USER=your-ethereal-user
ETHEREAL_PASS=your-ethereal-pass
```

**Produzione (SMTP):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Funzionalità

- ✅ Email di verifica registrazione
- ✅ Email di reset password
- ✅ Email di benvenuto
- ✅ Template HTML con stile coerente
- ✅ Supporto multi-lingua (IT/EN/FR/ES/DE)

---

## 🖼️ 2. Upload Avatar Utente

### Caratteristiche

- Upload immagini (JPEG, PNG, WebP, GIF)
- Crop e resize automatico
- Generazione multi-dimensionale (64px - 1024px)
- Conversione automatica in WebP
- Avatar default con iniziali

### API Endpoints

```
POST   /api/user/avatar          - Upload avatar
POST   /api/user/avatar/crop     - Upload con crop
DELETE /api/user/avatar          - Elimina avatar
GET    /api/user/:userId/avatar  - Ottieni avatar
```

---

## 📚 3. Sistema di Prestiti

### Configurazione

```env
LOAN_PERIOD_DAYS=14
MAX_LOANS_PER_USER=5
MAX_RENEWALS=2
```

### Funzionalità

- ✅ Creazione prestiti
- ✅ Restituzione libri
- ✅ Rinnovo prestiti (max 2)
- ✅ Tracciamento stato (active/returned/overdue/lost)
- ✅ Limite prestiti per utente

### API Endpoints

```
POST   /api/books/:bookId/loan          - Crea prestito
POST   /api/loans/:loanId/return        - Restituisci
POST   /api/loans/:loanId/renew         - Rinnova
GET    /api/loans                       - Lista prestiti
GET    /api/loans/:loanId               - Dettagli
GET    /api/admin/loans/overdue         - In ritardo (admin)
```

---

## 📝 4. Logging Strutturato con Winston

### Caratteristiche

- Log con rotazione giornaliera
- Livelli: error, warn, info, debug
- Formato JSON in produzione
- Log separati per: application, error, audit, exceptions

### Struttura Log

```
logs/
├── application-2024-01-15.log
├── error-2024-01-15.log
├── audit-2024-01-15.log
└── exceptions-2024-01-15.log
```

---

## 💾 5. Backup Automatico Database

### Caratteristiche

- Backup automatico SQLite
- Compressione gzip
- Pulizia automatica vecchi backup
- Supporto WAL e SHM files

### Utilizzo

```bash
npm run backup
```

### Configurazione

```env
BACKUP_DIR=./storage/backups
MAX_BACKUPS=30
```

---

## 🏥 6. Health Check Avanzato

### Endpoint

```
GET /api/health         - Health check base
GET /api/health/detailed - Health check dettagliato
```

### Risposta

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "status": "healthy",
  "uptime": 86400,
  "memory": { "rss": 52822016 },
  "disk": { "status": "ok" },
  "database": { "status": "ok", "stats": { "users": 150, "books": 500 } }
}
```

---

## 🐳 7. Docker Containerizzazione

### Comandi

```bash
# Build e avvio
docker-compose up -d

# Con PostgreSQL
docker-compose --profile production up -d

# Con monitoring
docker-compose --profile monitoring up -d
```

---

## 📊 Miglioramenti Prestazioni

1. **Logging asincrono**: Non blocca il thread principale
2. **Compressione backup**: Riduce spazio del 70-80%
3. **Avatar WebP**: Formato ottimizzato per web
4. **Indici database**: Query più veloci
5. **Health check**: Monitoraggio proattivo

---

## 🔒 Sicurezza

1. **Log rotation**: Prevenzione disk overflow
2. **Non-root user**: Container security
3. **Input validation**: Tutte le API
4. **Rate limiting**: Protezione DDoS
5. **Audit trail**: Tracciabilità completa

---

## 📝 Note di Aggiornamento

Per aggiornare dalla v1.0:

1. Esegui `npm install` per le nuove dipendenze
2. Copia `.env.example` in `.env` e configura
3. Esegui backup database esistente
4. Avvia con `npm start` o `docker-compose up -d`
