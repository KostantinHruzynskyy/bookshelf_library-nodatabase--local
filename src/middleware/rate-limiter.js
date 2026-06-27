'use strict';

function createRateLimiter(max, windowMs, blockMs) {
  const hits = new Map();
  const blocks = new Map();
  return function(req, res, next) {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const key = ip + '|' + (req.originalUrl || req.url);
    const now = Date.now();

    if (blocks.has(key) && now < blocks.get(key)) {
      res.setHeader('Retry-After', Math.ceil((blocks.get(key) - now) / 1000));
      return res.status(429).json({ error: 'rate_limited', message: 'Too many requests.' });
    }

    const window = hits.get(key) || [];
    const recent = window.filter(t => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);

    if (recent.length > max) {
      blocks.set(key, now + blockMs);
      setTimeout(() => blocks.delete(key), blockMs);
      res.setHeader('Retry-After', Math.ceil(blockMs / 1000));
      return res.status(429).json({ error: 'rate_limited', message: 'Too many requests.' });
    }

    if (Math.random() < 0.01) hits.delete(key);
    next();
  };
}

module.exports = { createRateLimiter };

