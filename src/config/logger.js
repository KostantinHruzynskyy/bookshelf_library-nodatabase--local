'use strict';

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Formato personalizzato per i log
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (stack) log += `\n${stack}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Formato JSON per produzione
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Determina il formato basato sull'ambiente
const isProduction = process.env.NODE_ENV === 'production';
const selectedFormat = isProduction ? jsonFormat : logFormat;

// Transport per file con rotazione giornaliera
const fileRotateTransport = new DailyRotateFile({
  filename: path.join(__dirname, '../../logs/application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: selectedFormat
});

// Transport per errori separato
const errorRotateTransport = new DailyRotateFile({
  filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: selectedFormat
});

// Transport per audit log
const auditTransport = new DailyRotateFile({
  filename: path.join(__dirname, '../../logs/audit-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '50m',
  maxFiles: '90d',
  format: jsonFormat
});

// Crea il logger principale
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: selectedFormat,
  transports: [
    fileRotateTransport,
    errorRotateTransport
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d'
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d'
    })
  ]
});

// Aggiungi console transport in development
if (!isProduction) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    )
  }));
}

// Logger separato per audit trail
const auditLogger = winston.createLogger({
  level: 'info',
  format: jsonFormat,
  transports: [auditTransport]
});

// Funzioni helper per audit
function logAudit(event) {
  auditLogger.info('AUDIT', {
    timestamp: new Date().toISOString(),
    userId: event.userId || null,
    action: event.action,
    resource: event.resource,
    resourceId: event.resourceId || null,
    details: event.details || {},
    ip: event.ip || null,
    userAgent: event.userAgent || null,
    success: event.success !== false
  });
}

// Funzione per loggare richieste HTTP
function logRequest(req, res, duration) {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || null,
    // Nota: req.user potrebbe non essere disponibile se il middleware auth non è applicato
    statusCode: res.statusCode,
    duration: `${duration}ms`
  };

  if (res.statusCode >= 400) {
    logger.warn('HTTP Request', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
}

// Funzione per loggare errori di autenticazione
function logAuth(event) {
  logger.info('AUTH', {
    timestamp: new Date().toISOString(),
    event: event.type,
    email: event.email || null,
    userId: event.userId || null,
    ip: event.ip || null,
    success: event.success,
    reason: event.reason || null
  });
}

// Funzione per loggare operazioni sui libri
function logBookAction(event) {
  logger.info('BOOK', {
    timestamp: new Date().toISOString(),
    action: event.action,
    bookId: event.bookId,
    userId: event.userId,
    details: event.details || {}
  });
  logAudit({
    userId: event.userId,
    action: `book.${event.action}`,
    resource: 'book',
    resourceId: event.bookId,
    details: event.details
  });
}

module.exports = {
  logger,
  auditLogger,
  logAudit,
  logRequest,
  logAuth,
  logBookAction
};