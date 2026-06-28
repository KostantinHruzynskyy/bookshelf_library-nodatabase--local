'use strict';

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getDb } = require('../database/connection');
const { logger } = require('../config/logger');

const AVATAR_DIR = path.join(__dirname, '../../public/uploads/avatars');
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const AVATAR_SIZES = { thumbnail: 64, small: 128, medium: 256, large: 512 };

if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

const storage = multer.memoryStorage();
const uploadAvatar = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Formato non supportato. Usa: ${ALLOWED_MIME.join(', ')}`));
    }
  }
}).single('avatar');

async function processAvatar(userId, file) {
  try {
    if (!file) throw new Error('Nessun file fornito');

    const user = getDb().prepare('SELECT id, avatar_url FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('Utente non trovato');

    if (user.avatar_url) deleteOldAvatars(userId);

    const timestamp = Date.now();
    const baseFilename = `avatar_${userId}_${timestamp}`;
    const results = {};

    // Original
    const originalFilename = `${baseFilename}_original.webp`;
    await sharp(file.buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(AVATAR_DIR, originalFilename));
    results.original = `/uploads/avatars/${originalFilename}`;

    // Generate sizes
    for (const [sizeName, sizeValue] of Object.entries(AVATAR_SIZES)) {
      const filename = `${baseFilename}_${sizeName}.webp`;
      await sharp(file.buffer)
        .resize(sizeValue, sizeValue, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(path.join(AVATAR_DIR, filename));
      results[sizeName] = `/uploads/avatars/${filename}`;
    }

    getDb().prepare('UPDATE users SET avatar_url = ?, avatar_thumbnail = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(results.medium, results.thumbnail, userId);

    logger.info('Avatar processed', { userId });
    return { success: true, avatarUrl: results.medium, thumbnailUrl: results.thumbnail, allSizes: results };

  } catch (error) {
    logger.error('Avatar processing failed', { userId, error: error.message });
    throw error;
  }
}

async function cropAvatar(userId, file, cropData) {
  try {
    const { x, y, width, height } = cropData;
    if (!x || !y || !width || !height) throw new Error('Dati di ritaglio mancanti');

    const user = getDb().prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('Utente non trovato');

    deleteOldAvatars(userId);

    const timestamp = Date.now();
    const baseFilename = `avatar_${userId}_${timestamp}`;
    const results = {};

    for (const [sizeName, sizeValue] of Object.entries({ ...AVATAR_SIZES, original: 1024 })) {
      const filename = `${baseFilename}_${sizeName}.webp`;
      await sharp(file.buffer)
        .extract({ left: x, top: y, width, height })
        .resize(sizeValue, sizeValue, sizeName === 'original' ? 
          { fit: 'inside', withoutEnlargement: true } : { fit: 'cover' })
        .webp({ quality: 85 })
        .toFile(path.join(AVATAR_DIR, filename));
      results[sizeName] = `/uploads/avatars/${filename}`;
    }

    getDb().prepare('UPDATE users SET avatar_url = ?, avatar_thumbnail = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(results.medium, results.thumbnail, userId);

    logger.info('Avatar cropped', { userId });
    return { success: true, avatarUrl: results.medium, thumbnailUrl: results.thumbnail };

  } catch (error) {
    logger.error('Avatar cropping failed', { userId, error: error.message });
    throw error;
  }
}

function deleteAvatar(userId) {
  try {
    const user = getDb().prepare('SELECT avatar_url FROM users WHERE id = ?').get(userId);
    if (!user || !user.avatar_url) return { success: true, message: 'Nessun avatar' };

    deleteOldAvatars(userId);
    getDb().prepare('UPDATE users SET avatar_url = NULL, avatar_thumbnail = NULL WHERE id = ?').run(userId);

    logger.info('Avatar deleted', { userId });
    return { success: true, message: 'Avatar eliminato' };
  } catch (error) {
    logger.error('Avatar deletion failed', { userId, error: error.message });
    throw error;
  }
}

function deleteOldAvatars(userId) {
  try {
    const files = fs.readdirSync(AVATAR_DIR).filter(f => f.startsWith(`avatar_${userId}_`));
    files.forEach(f => fs.unlinkSync(path.join(AVATAR_DIR, f)));
  } catch (error) {
    logger.warn('Failed to delete old avatars', { error: error.message });
  }
}

function getUserAvatar(userId) {
  try {
    const user = getDb().prepare('SELECT avatar_url, avatar_thumbnail, username FROM users WHERE id = ?').get(userId);
    return user ? { avatarUrl: user.avatar_url, thumbnailUrl: user.avatar_thumbnail, username: user.username } : null;
  } catch (error) {
    logger.error('Failed to get avatar', { userId, error: error.message });
    return null;
  }
}

function generateDefaultAvatar(username) {
  const initials = username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=8b4513&color=fff&size=256`;
}

module.exports = { 
  uploadAvatar, 
  processAvatar, 
  cropAvatar, 
  deleteAvatar, 
  getUserAvatar, 
  generateDefaultAvatar, 
  AVATAR_DIR 
};