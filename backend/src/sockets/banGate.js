const mongoose = require('mongoose');
const Ban = require('../models/Ban');
const { getSocketIp } = require('../utils/ipHelper');

/**
 * Runs before a socket finishes connecting. If Mongo is unreachable we
 * fail OPEN (let the connection through) rather than locking everyone
 * out because the ban list happens to be unavailable — banning is a
 * moderation nice-to-have, not the thing that should take the whole
 * app down.
 *
 * Mongoose buffers queries by default and only rejects them after its
 * own ~10s command buffer timeout when there's no live connection —
 * which would mean every single user feels a 10-second stall on every
 * connection if Mongo is down or simply unconfigured. Checking
 * readyState first lets that case fail open immediately instead.
 */
function banGate() {
  return async (socket, next) => {
    const ip = getSocketIp(socket);
    socket.data.ip = ip;

    if (mongoose.connection.readyState !== 1) {
      return next(); // not connected — skip straight to "allow", no buffering wait
    }

    try {
      const ban = await Ban.isIpBanned(ip);
      if (ban) {
        const err = new Error('banned');
        err.data = { reason: ban.reason || 'You have been banned from ChatFlow.' };
        return next(err);
      }
    } catch (err) {
      console.warn('[banGate] Ban check failed, allowing connection:', err.message);
    }

    next();
  };
}

module.exports = banGate;
