const { nanoid } = require('nanoid');
const usernameRegistry = require('../utils/usernameRegistry');
const roomManager = require('../utils/roomManager');
const pairingQueue = require('./pairingQueue');
const banGate = require('./banGate');
const messageBus = require('./messageBus');

const LOBBY = 'lobby';
const MAX_MESSAGE_LENGTH = 2000;
const REQUEST_TIMEOUT_MS = 30 * 1000;
const RATE_LIMIT_WINDOW_MS = 3000;
const RATE_LIMIT_MAX_MESSAGES = 12;

/** Media messages must point at our own Cloudinary account — a client
 * can't just send any URL and have it rendered as if it were uploaded
 * through our signed-upload flow. */
function isTrustedMediaUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'res.cloudinary.com' &&
      (!cloudName || parsed.pathname.startsWith(`/${cloudName}/`))
    );
  } catch {
    return false;
  }
}

/** socketId -> { count, windowStart } — resets every RATE_LIMIT_WINDOW_MS */
const messageRateState = new Map();

function isRateLimited(socketId) {
  const now = Date.now();
  const entry = messageRateState.get(socketId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    messageRateState.set(socketId, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_MESSAGES;
}

/** requestId -> { fromSocketId, fromUsername, targetSocketId, targetUsername, timer } */
const pendingRequests = new Map();

function broadcastActiveUsers(io) {
  const lobby = roomManager.getRoom(LOBBY);
  const usernames = lobby ? lobby.participants.map((p) => p.username) : [];
  io.to(LOBBY).emit('active-users-update', usernames);
}

/** Tries to drain the pairing queue, creating rooms for every full pair available. */
function attemptPairing(io) {
  let pair = pairingQueue.tryPair();
  while (pair) {
    const [a, b] = pair;
    const socketA = io.sockets.sockets.get(a.socketId);
    const socketB = io.sockets.sockets.get(b.socketId);

    // One side vanished between being queued and being matched — drop
    // it and keep trying with whoever's left.
    if (!socketA && !socketB) {
      pair = pairingQueue.tryPair();
      continue;
    }
    if (!socketA) {
      pairingQueue.enqueue(b.username, b.socketId);
      pair = pairingQueue.tryPair();
      continue;
    }
    if (!socketB) {
      pairingQueue.enqueue(a.username, a.socketId);
      pair = pairingQueue.tryPair();
      continue;
    }

    const room = roomManager.createPrivateRoom('paired', a, b);
    socketA.join(room.roomId);
    socketB.join(room.roomId);
    socketA.emit('paired', { roomId: room.roomId, partner: b.username });
    socketB.emit('paired', { roomId: room.roomId, partner: a.username });

    pair = pairingQueue.tryPair();
  }
}

/**
 * Shared teardown for a private room (1:1, paired or direct), used by
 * both explicit "leave" and disconnect. Notifies whoever is left and,
 * for randomly-paired rooms only, drops them back in the queue — per
 * spec, direct-request rooms don't auto-requeue since there's no queue
 * concept for that mode.
 */
function endPrivateRoom(io, roomId, leavingSocketId, eventName) {
  const room = roomManager.getRoom(roomId);
  if (!room || room.type === 'group') return;

  const remaining = room.participants.filter((p) => p.socketId !== leavingSocketId);
  roomManager.endRoom(roomId, eventName);

  for (const participant of remaining) {
    const sock = io.sockets.sockets.get(participant.socketId);
    if (!sock) continue;
    sock.leave(roomId);

    const requeued = room.type === 'paired';
    sock.emit(eventName, { roomId, requeued });

    if (requeued) {
      pairingQueue.enqueue(participant.username, participant.socketId);
    }
  }

  if (room.type === 'paired') {
    attemptPairing(io);
  }
}

function clearPendingRequestsFor(socketId) {
  for (const [requestId, req] of pendingRequests.entries()) {
    if (req.fromSocketId === socketId || req.targetSocketId === socketId) {
      clearTimeout(req.timer);
      pendingRequests.delete(requestId);
    }
  }
}

function registerUserNamespace(io) {
  io.use(banGate());

  io.on('connection', (socket) => {
    // ---- Identity -------------------------------------------------
    socket.on('check-username', (username, cb) => {
      if (typeof cb !== 'function') return;
      if (!usernameRegistry.isValidFormat(username)) {
        cb({ available: false, reason: '2-20 characters: letters, numbers, _ or - only.' });
        return;
      }
      const available = usernameRegistry.isAvailable(username);
      cb({ available, reason: available ? null : 'That username is already taken.' });
    });

    socket.on('join', (username, cb) => {
      try {
        const display = usernameRegistry.claim(username, socket.id);
        socket.data.username = display;
        socket.join(LOBBY);
        roomManager.addParticipant(LOBBY, { username: display, socketId: socket.id });
        broadcastActiveUsers(io);
        if (typeof cb === 'function') cb({ success: true, username: display });
      } catch (err) {
        if (typeof cb === 'function') cb({ success: false, error: err.message });
      }
    });

    // ---- Random 1:1 pairing ---------------------------------------
    socket.on('find-partner', (_payload, cb) => {
      const username = socket.data.username;
      if (!username) {
        if (typeof cb === 'function') cb({ success: false, error: 'Join with a username first.' });
        return;
      }
      pairingQueue.enqueue(username, socket.id);
      if (typeof cb === 'function') cb({ success: true });
      attemptPairing(io);
    });

    socket.on('leave-queue', (_payload, cb) => {
      pairingQueue.remove(socket.id);
      if (typeof cb === 'function') cb({ success: true });
    });

    // ---- Direct request to a specific user -------------------------
    socket.on('request-chat', ({ targetUsername } = {}, cb) => {
      const fromUsername = socket.data.username;
      if (!fromUsername) {
        if (typeof cb === 'function') cb({ success: false, error: 'Join with a username first.' });
        return;
      }
      const targetSocketId = usernameRegistry.getSocketId(targetUsername);
      if (!targetSocketId || targetSocketId === socket.id) {
        if (typeof cb === 'function') cb({ success: false, error: 'That user is not online.' });
        return;
      }
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (!targetSocket) {
        if (typeof cb === 'function') cb({ success: false, error: 'That user is not online.' });
        return;
      }

      const requestId = nanoid(10);
      const timer = setTimeout(() => {
        if (!pendingRequests.has(requestId)) return;
        pendingRequests.delete(requestId);
        socket.emit('request-declined', { targetUsername, reason: 'timed-out' });
      }, REQUEST_TIMEOUT_MS);

      pendingRequests.set(requestId, {
        fromSocketId: socket.id,
        fromUsername,
        targetSocketId,
        targetUsername: usernameRegistry.getUsername(targetSocketId),
        timer,
      });

      targetSocket.emit('incoming-request', { requestId, fromUsername });
      if (typeof cb === 'function') cb({ success: true, requestId });
    });

    socket.on('respond-request', ({ requestId, accept } = {}, cb) => {
      const req = pendingRequests.get(requestId);
      if (!req || req.targetSocketId !== socket.id) {
        if (typeof cb === 'function') cb({ success: false, error: 'That request is no longer valid.' });
        return;
      }
      clearTimeout(req.timer);
      pendingRequests.delete(requestId);

      const requesterSocket = io.sockets.sockets.get(req.fromSocketId);

      if (!accept) {
        if (requesterSocket) {
          requesterSocket.emit('request-declined', { targetUsername: req.targetUsername, reason: 'declined' });
        }
        if (typeof cb === 'function') cb({ success: true });
        return;
      }

      if (!requesterSocket) {
        if (typeof cb === 'function') cb({ success: false, error: 'The requester disconnected.' });
        return;
      }

      const room = roomManager.createPrivateRoom(
        'direct',
        { username: req.fromUsername, socketId: req.fromSocketId },
        { username: req.targetUsername, socketId: socket.id }
      );
      requesterSocket.join(room.roomId);
      socket.join(room.roomId);
      requesterSocket.emit('request-accepted', { roomId: room.roomId, partner: req.targetUsername });
      socket.emit('request-accepted', { roomId: room.roomId, partner: req.fromUsername });
      if (typeof cb === 'function') cb({ success: true, roomId: room.roomId });
    });

    // ---- Messaging (group + private share this one event) ----------
    socket.on('send-message', ({ roomId, type, content, durationSeconds } = {}, cb) => {
      const username = socket.data.username;
      if (!username) {
        if (typeof cb === 'function') cb({ success: false, error: 'Join with a username first.' });
        return;
      }
      if (isRateLimited(socket.id)) {
        if (typeof cb === 'function') cb({ success: false, error: "You're sending messages too fast." });
        return;
      }
      if (!roomId || !socket.rooms.has(roomId)) {
        if (typeof cb === 'function') cb({ success: false, error: "You're not in that room." });
        return;
      }
      if (!['text', 'image', 'voice'].includes(type)) {
        if (typeof cb === 'function') cb({ success: false, error: 'Unknown message type.' });
        return;
      }
      if (typeof content !== 'string' || !content.trim()) {
        if (typeof cb === 'function') cb({ success: false, error: 'Message content is empty.' });
        return;
      }
      if (type === 'text' && content.length > MAX_MESSAGE_LENGTH) {
        if (typeof cb === 'function') cb({ success: false, error: 'Message is too long.' });
        return;
      }
      if ((type === 'image' || type === 'voice') && !isTrustedMediaUrl(content)) {
        if (typeof cb === 'function') cb({ success: false, error: 'Media must be uploaded through ChatFlow.' });
        return;
      }

      const message = {
        roomId,
        username,
        type,
        content: type === 'text' ? content.trim() : content, // image/voice: content is a Cloudinary URL
        durationSeconds: type === 'voice' ? Number(durationSeconds) || 0 : undefined,
        timestamp: Date.now(),
      };

      // Broadcast to the room, including the sender, so every client
      // renders from one source of truth. Never written anywhere —
      // this is the entire lifetime of a ChatFlow message. The only
      // other place it travels is the live admin relay (messageBus),
      // which is also fire-and-forget, never persisted.
      io.to(roomId).emit('new-message', message);
      messageBus.emit('message', message);
      if (typeof cb === 'function') cb({ success: true });
    });

    socket.on('typing', ({ roomId, isTyping } = {}) => {
      const username = socket.data.username;
      if (!username || !roomId || !socket.rooms.has(roomId)) return;
      socket.to(roomId).emit('typing', { roomId, username, isTyping: !!isTyping });
    });

    // ---- Leaving a private room on purpose --------------------------
    socket.on('leave-room', ({ roomId } = {}, cb) => {
      endPrivateRoom(io, roomId, socket.id, 'partner-left');
      if (typeof cb === 'function') cb({ success: true });
    });

    // ---- Disconnect ---------------------------------------------------
    socket.on('disconnect', () => {
      pairingQueue.remove(socket.id);
      clearPendingRequestsFor(socket.id);
      messageRateState.delete(socket.id);

      for (const room of roomManager.findRoomsBySocket(socket.id)) {
        endPrivateRoom(io, room.roomId, socket.id, 'partner-disconnected');
      }

      roomManager.removeParticipantBySocket(LOBBY, socket.id);
      usernameRegistry.scheduleRelease(socket.id);
      broadcastActiveUsers(io);
    });
  });
}

module.exports = { registerUserNamespace, pendingRequests };
