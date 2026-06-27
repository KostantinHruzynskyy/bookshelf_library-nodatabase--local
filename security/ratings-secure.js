'use strict';

function validateRatingInput(body) {
  const rating = parseInt(body.rating, 10);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: 'Invalid rating. Must be 1-5.' };
  }
  const review = (body.review || '').replace(/[<>"']/g, '').replace(/javascript:/gi, '').replace(/on\w+\s*=/gi, '').replace(/data:/gi, '').trim().slice(0, 2000);
  return { ok: true, rating, review: review || null };
}

const rateLimitMap = new Map();
function checkRatingRateLimit(userId) {
  const now = Date.now();
  const key = 'rate:' + userId;
  const win = (rateLimitMap.get(key) || []).filter(t => now - t < 60_000);
  win.push(now);
  rateLimitMap.set(key, win);
  if (win.length > 30) return false;
  return true;
}

module.exports = { validateRatingInput, checkRatingRateLimit };

