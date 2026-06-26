const { SOCKET_MESSAGE_RATE_LIMIT } = require('../config/constants');

const hits = new Map(); // socketId -> array of timestamps

function isRateLimited(socketId) {
  const now = Date.now();
  const windowStart = now - SOCKET_MESSAGE_RATE_LIMIT.WINDOW_MS;
  const timestamps = (hits.get(socketId) || []).filter((t) => t > windowStart);

  if (timestamps.length >= SOCKET_MESSAGE_RATE_LIMIT.MAX_MESSAGES) {
    hits.set(socketId, timestamps);
    return true;
  }

  timestamps.push(now);
  hits.set(socketId, timestamps);
  return false;
}

function clearSocket(socketId) {
  hits.delete(socketId);
}

module.exports = { isRateLimited, clearSocket };
