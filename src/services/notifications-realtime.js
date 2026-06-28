'use strict';

const { logger } = require('../config/logger');
const clients = new Map();

function addClient(userId, res) {
  clients.set(userId, res);
  logger.info('SSE client connected', { userId });
  sendToClient(userId, { type: 'connected', message: 'Connesso' });
}

function removeClient(userId) {
  clients.delete(userId);
  logger.info('SSE client connected', { userId });
}

function sendToClient(userId, data) {
  const client = clients.get(userId);
  if (client) client.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcast(data) {
  for (const [userId, client] of clients) {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

function sendNotification(userId, type, message, data = {}) {
  sendToClient(userId, { type, message, data, timestamp: new Date().toISOString() });
}

function handleSSE(req, res) {
  const userId = req.user.id;
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
  addClient(userId, res);
  const heartbeat = setInterval(() => res.write(':heartbeat\n\n'), 30000);
  req.on('close', () => { clearInterval(heartbeat); removeClient(userId); });
}

module.exports = { addClient, removeClient, sendToClient, broadcast, sendNotification, handleSSE, getClientCount: () => clients.size };
