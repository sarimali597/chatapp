const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const roomManager = require('../utils/roomManager');
const usernameRegistry = require('../utils/usernameRegistry');
const messageBus = require('./messageBus');
const Ban = require('../models/Ban');
const { getSocketIp } = require('../utils/ipHelper');

function adminAuthMiddleware(socket, next) {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) return next(new Error('Missing admin token.'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') return next(new Error('Not an admin token.'));
    socket.data.admin = payload;
    next();
  } catch (err) {
    next(new Error('Invalid or expired admin token.'));
  }
}

/**
 * Everything here is read-only observation plus moderation actions.
 * There is deliberately no database write path for message content —
 * `messageBus` is a live, unbuffered relay (see sockets/messageBus.js).
 * The only thing this namespace ever persists is the IP ban list,
 * which is a moderation record, not chat content.
 */
function registerAdminNamespace(io) {
  const adminIo = io.of('/admin');
  adminIo.use(adminAuthMiddleware);

  const pushRoomsUpdate = () => {
    adminIo.emit('rooms-update', roomManager.listRoomsForAdmin());
  };
  roomManager.on('room-created', pushRoomsUpdate);
  roomManager.on('room-updated', pushRoomsUpdate);
  roomManager.on('room-ended', pushRoomsUpdate);

  // Live relay only — see messageBus.js. No write to any store here.
  messageBus.on('message', (message) => {
    adminIo.emit('new-message', message);
  });

  adminIo.on('connection', (socket) => {
    // Snapshot on connect so a freshly-opened dashboard isn't empty
    // until the next room event — this is metadata (who/where), never
    // message content, so it's fine that it "replays" current state.
    socket.emit('rooms-update', roomManager.listRoomsForAdmin());

    socket.on('kick-user', ({ username } = {}, cb) => {
      const targetSocketId = usernameRegistry.getSocketId(username);
      const targetSocket = targetSocketId ? io.sockets.sockets.get(targetSocketId) : null;
      if (!targetSocket) {
        if (typeof cb === 'function') cb({ success: false, error: 'User is not online.' });
        return;
      }
      targetSocket.emit('kicked', { reason: 'Removed by an administrator.' });
      targetSocket.disconnect(true);
      if (typeof cb === 'function') cb({ success: true });
    });

    socket.on('ban-ip', async ({ username, reason } = {}, cb) => {
      if (mongoose.connection.readyState !== 1) {
        if (typeof cb === 'function') cb({ success: false, error: 'Database is unavailable — ban not saved.' });
        return;
      }
      try {
        const targetSocketId = usernameRegistry.getSocketId(username);
        const targetSocket = targetSocketId ? io.sockets.sockets.get(targetSocketId) : null;
        if (!targetSocket) {
          if (typeof cb === 'function') cb({ success: false, error: 'User is not online.' });
          return;
        }
        const ip = targetSocket.data.ip || getSocketIp(targetSocket);
        await Ban.findOneAndUpdate(
          { ip },
          {
            ip,
            reason: reason || 'Banned by admin',
            bannedUsername: username,
            bannedBy: (socket.data.admin && socket.data.admin.username) || 'admin',
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        targetSocket.emit('kicked', { reason: reason || 'You have been banned from ChatFlow.' });
        targetSocket.disconnect(true);
        if (typeof cb === 'function') cb({ success: true });
      } catch (err) {
        if (typeof cb === 'function') cb({ success: false, error: 'Could not save the ban — is MongoDB connected?' });
      }
    });

    socket.on('end-room', ({ roomId } = {}, cb) => {
      const room = roomManager.getRoom(roomId);
      if (!room || room.type === 'group') {
        if (typeof cb === 'function') cb({ success: false, error: 'Room not found.' });
        return;
      }
      for (const participant of room.participants) {
        const sock = io.sockets.sockets.get(participant.socketId);
        if (!sock) continue;
        sock.leave(roomId);
        sock.emit('room-ended', { roomId, reason: 'Ended by an administrator.' });
      }
      roomManager.endRoom(roomId, 'admin-ended');
      if (typeof cb === 'function') cb({ success: true });
    });
  });
}

module.exports = registerAdminNamespace;
