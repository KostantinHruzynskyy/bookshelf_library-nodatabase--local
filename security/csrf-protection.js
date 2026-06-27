'use strict';

function csrfGuard(req, res, next) {
  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);
  if (safeMethods.has(req.method)) return next();

  const origin = req.get('origin');
  const referer = req.get('referer');
  const host = req.get('host');
  const expectedOrigin = (req.headers['x-forwarded-proto'] === 'https' || req.connection.encrypted ? 'https' : 'http') + '://' + host;
  const source = origin || (referer ? referer.replace(/\/+$/, '').split('/').slice(0, 3).join('/') : null);
  if (source && source !== expectedOrigin) {
    return res.status(403).json({ error: 'csrf_invalid', message: 'Invalid request origin.' });
  }
  next();
}

module.exports = { csrfGuard };

