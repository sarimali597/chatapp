/**
 * Render (and most PaaS) sit behind a reverse proxy, so the "real" client
 * IP arrives in the X-Forwarded-For header, not the raw socket address.
 * Express needs `app.set('trust proxy', 1)` (done in server.js) for
 * req.ip to be correct; Socket.IO doesn't know about that setting, so we
 * read the handshake headers directly for sockets.
 */

function getIpFromHeaders(headers, fallback) {
  const forwarded = headers['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For can be a comma-separated list; the first entry is
    // the original client.
    return forwarded.split(',')[0].trim();
  }
  return fallback || 'unknown';
}

function getSocketIp(socket) {
  return getIpFromHeaders(socket.handshake.headers, socket.handshake.address);
}

function getRequestIp(req) {
  // req.ip already respects `trust proxy`, but fall back to the header
  // directly in case that setting is ever missing.
  return req.ip || getIpFromHeaders(req.headers, req.socket?.remoteAddress);
}

module.exports = { getSocketIp, getRequestIp };
