const userStore = require('../../utils/userStore');
const roomStore = require('../../utils/roomStore');
const requestStore = require('../../utils/requestStore');
const messageStore = require('../../utils/messageStore');
const restrictionStore = require('../../utils/restrictionStore');
const rateLimiter = require('../../utils/socketRateLimiter');
const { sanitizeText } = require('../../utils/sanitize');
const { isValidMessageText, isValidUsername } = require('../../utils/validators');
const { generateId } = require('../../utils/idGenerator');
const { MESSAGE_STATUS, GLOBAL_ROOM } = require('../../config/constants');
const { closeRoomAndNotify } = require('./connectionHandler');

function emitToUsername(io, username, event, payload) {
  const user = userStore.getUserByUsername(username);
  if (user) io.to(user.socketId).emit(event, payload);
}

function openRoom(io, room) {
  room.participants.forEach((username) => {
    const partner = room.participants.find((p) => p !== username);
    emitToUsername(io, username, 'room:created', {
      roomId: room.id,
      type: room.type,
      partner,
      history: [],
    });
  });
}

function register(io, socket) {
  // --- Send a private chat request ---
  socket.on('private:request', (payload) => {
    const from = socket.data.username;
    if (!from) return;

    const to = sanitizeText((payload && payload.to) || '').trim();
    if (!isValidUsername(to) || to === from) {
      return socket.emit('action:error', { error: 'Invalid request target.' });
    }

    if (restrictionStore.isRestricted(from)) {
      return socket.emit('action:error', { error: 'You are currently restricted from chatting.' });
    }

    const targetUser = userStore.getUserByUsername(to);
    if (!targetUser) {
      return socket.emit('action:error', { error: `${to} is no longer online.` });
    }

    if (requestStore.hasPendingRequestBetween(from, to)) {
      return socket.emit('action:error', { error: 'A request is already pending with this user.' });
    }

    const alreadyInRoom = roomStore.findRoomsForUser(from).some((r) => r.participants.includes(to));
    if (alreadyInRoom) {
      return socket.emit('action:error', { error: `You're already chatting with ${to}.` });
    }

    const request = requestStore.createRequest(from, to);
    socket.emit('private:request:sent', { requestId: request.id, to });
    emitToUsername(io, to, 'private:request:incoming', { requestId: request.id, from });
  });

  // --- Respond to a private chat request ---
  socket.on('private:request:respond', (payload) => {
    const responder = socket.data.username;
    if (!responder) return;

    const requestId = payload && payload.requestId;
    const accept = !!(payload && payload.accept);
    const request = requestStore.getRequest(requestId);

    if (!request || request.to !== responder) {
      return socket.emit('action:error', { error: 'This request is no longer valid.' });
    }

    requestStore.deleteRequest(requestId);

    if (!accept) {
      emitToUsername(io, request.from, 'private:request:rejected', { requestId, by: responder });
      return;
    }

    const fromUser = userStore.getUserByUsername(request.from);
    if (!fromUser) {
      return socket.emit('action:error', { error: `${request.from} is no longer online.` });
    }

    const room = roomStore.createRoom('private', [request.from, responder]);
    [fromUser.socketId, socket.id].forEach((sid) => io.sockets.sockets.get(sid) && io.sockets.sockets.get(sid).join(room.id));
    openRoom(io, room);
  });

  // --- Send a message inside a private or random room ---
  socket.on('room:message', (payload) => {
    const username = socket.data.username;
    if (!username) return;

    const roomId = payload && payload.roomId;
    if (!roomId || !roomStore.isParticipant(roomId, username)) {
      return socket.emit('action:error', { error: 'You are not part of this conversation.' });
    }

    if (restrictionStore.isMuted(username) || restrictionStore.isRestricted(username)) {
      return socket.emit('action:error', { error: 'You are currently restricted from chatting.' });
    }

    if (rateLimiter.isRateLimited(socket.id)) {
      return socket.emit('action:error', { error: 'You are sending messages too quickly. Please slow down.' });
    }

    const room = roomStore.getRoom(roomId);
    const partnerUsername = room.participants.find((p) => p !== username);
    const partner = userStore.getUserByUsername(partnerUsername);

    const type = payload.type === 'image' ? 'image' : 'text';
    let content = payload.content;

    if (type === 'text') {
      if (!isValidMessageText(content)) return;
      content = sanitizeText(content);
    } else if (typeof content !== 'string' || !content.startsWith('https://res.cloudinary.com')) {
      return socket.emit('action:error', { error: 'Invalid image content.' });
    }

    const partnerIsViewing = !!partner && partner.currentView === roomId;
    const message = {
      id: generateId(),
      type,
      content,
      sender: username,
      room: roomId,
      timestamp: new Date().toISOString(),
      status: partnerIsViewing ? MESSAGE_STATUS.SEEN : MESSAGE_STATUS.DELIVERED,
    };

    messageStore.pushMessage(roomId, message);

    socket.emit('room:message', message);
    if (partner) io.to(partner.socketId).emit('room:message', message);
  });

  // --- Mark a room as currently focused/open, flushing read receipts ---
  socket.on('room:focus', (payload) => {
    const username = socket.data.username;
    if (!username) return;

    const roomId = (payload && payload.roomId) || GLOBAL_ROOM;
    if (roomId !== GLOBAL_ROOM && !roomStore.isParticipant(roomId, username)) return;

    userStore.setCurrentView(username, roomId);

    if (roomId === GLOBAL_ROOM) return;

    const updated = messageStore.markAllSeen(roomId, username);
    if (updated.length === 0) return;

    const room = roomStore.getRoom(roomId);
    const partnerUsername = room.participants.find((p) => p !== username);
    emitToUsername(io, partnerUsername, 'room:seen', {
      roomId,
      messageIds: updated.map((m) => m.id),
    });
  });

  // --- Leave/end a private or random room ---
  socket.on('room:leave', (payload) => {
    const username = socket.data.username;
    if (!username) return;

    const roomId = payload && payload.roomId;
    const room = roomStore.getRoom(roomId);
    if (!room || !room.participants.includes(username)) return;

    closeRoomAndNotify(io, room, 'left');
  });
}

module.exports = { register, emitToUsername, openRoom };
