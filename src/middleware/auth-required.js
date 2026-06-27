'use strict';

function authRequired(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'authentication_required', message: 'You must be logged in to perform this action.' });
  }
  next();
}

function adminRequired(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'authentication_required', message: 'You must be logged in.' });
  }
  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return res.status(403).json({ error: 'forbidden', message: 'Admin access required.' });
  }
  next();
}

module.exports = { authRequired, adminRequired };
