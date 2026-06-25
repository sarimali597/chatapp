const userStore = require('../../utils/userStore');
const roomStore = require('../../utils/roomStore');
const { GLOBAL_ROOM } = require('../../config/constants');

function register(io, socket) {
  socket.on('typing', (payload) => {
    const username = socket.data.username;
    if (!username) return;

    const scope = payload && payload.scope;
    const isTyping = !!(payload && payload.isTyping);

    if (scope === GLOBAL_ROOM) {
      socket.to(GLOBAL_ROOM).emit('typing', { username, scope, isTyping });
      return;
    }

    // Otherwise scope should be a private/random room the sender belongs to.
    if (typeof scope === 'string' && roomStore.isParticipant(scope, username)) {
      const room = roomStore.getRoom(scope);
      room.participants
        .filter((p) => p !== username)
        .forEach((p) => {
          const target = userStore.getUserByUsername(p);
          if (target) io.to(target.socketId).emit('typing', { username, scope, isTyping });
        });
    }
  });
}

module.exports = { register };
