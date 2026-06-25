const userStore = require('../../utils/userStore');
const roomStore = require('../../utils/roomStore');
const restrictionStore = require('../../utils/restrictionStore');
const { closeRoomAndNotify } = require('./connectionHandler');
const { openRoom } = require('./privateChatHandler');

function tryMatch(io, username) {
  const partnerUsername = roomStore.popNextMatch(username);

  if (!partnerUsername) {
    roomStore.addToQueue(username);
    const user = userStore.getUserByUsername(username);
    if (user) io.to(user.socketId).emit('random:waiting');
    return;
  }

  const room = roomStore.createRoom('random', [username, partnerUsername]);

  [username, partnerUsername].forEach((u) => {
    const user = userStore.getUserByUsername(u);
    if (user) {
      const socket = io.sockets.sockets.get(user.socketId);
      if (socket) socket.join(room.id);
    }
  });

  openRoom(io, room);
}

function register(io, socket) {
  socket.on('random:find', () => {
    const username = socket.data.username;
    if (!username) return;

    if (restrictionStore.isRestricted(username)) {
      return socket.emit('action:error', { error: 'You are currently restricted from chatting.' });
    }

    if (roomStore.isInQueue(username)) return;
    tryMatch(io, username);
  });

  socket.on('random:cancel', () => {
    const username = socket.data.username;
    if (!username) return;
    roomStore.removeFromQueue(username);
  });

  socket.on('random:skip', (payload) => {
    const username = socket.data.username;
    if (!username) return;

    const roomId = payload && payload.roomId;
    const room = roomStore.getRoom(roomId);

    if (room && room.type === 'random' && room.participants.includes(username)) {
      closeRoomAndNotify(io, room, 'skipped');
    }

    tryMatch(io, username);
  });
}

module.exports = { register };
