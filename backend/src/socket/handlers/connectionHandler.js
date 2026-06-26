const userStore = require('../../utils/userStore');
const roomStore = require('../../utils/roomStore');
const requestStore = require('../../utils/requestStore');
const restrictionStore = require('../../utils/restrictionStore');
const messageStore = require('../../utils/messageStore');
const rateLimiter = require('../../utils/socketRateLimiter');
const { sanitizeText } = require('../../utils/sanitize');
const { isValidUsername } = require('../../utils/validators');
const { GLOBAL_ROOM } = require('../../config/constants');
const { broadcastAdminStats } = require('../adminNamespace');

function broadcastUserList(io) {
  const users = userStore.getAllUsers().map(userStore.toPublicUser);
  io.to(GLOBAL_ROOM).emit('users:update', { users });
}

function closeRoomAndNotify(io, room, reason) {
  room.participants.forEach((username) => {
    const user = userStore.getUserByUsername(username);
    if (user) {
      io.to(user.socketId).emit('room:closed', { roomId: room.id, reason });
      userStore.setCurrentView(username, GLOBAL_ROOM);
    }
  });
  messageStore.clearRoomHistory(room.id);
  roomStore.deleteRoom(room.id);
}

function register(io, socket) {
  socket.on('user:join', (payload, ack) => {
    const username = sanitizeText((payload && payload.username) || '').trim();

    if (!isValidUsername(username)) {
      return ack({
        success: false,
        error: 'Usernames must be 3-20 characters: letters, numbers, and underscores only.',
      });
    }

    if (userStore.isUsernameTaken(username)) {
      return ack({ success: false, error: 'That username is already in use. Please choose another.' });
    }

    userStore.addUser(username, socket.id);
    socket.data.username = username;
    socket.join(GLOBAL_ROOM);

    ack({
      success: true,
      user: { username },
      history: messageStore.getHistory(GLOBAL_ROOM),
      onlineUsers: userStore.getAllUsers().map(userStore.toPublicUser),
    });

    broadcastUserList(io);
    broadcastAdminStats(io);
    console.log(`[ChatFlow] ${username} joined. Online: ${userStore.getOnlineCount()}`);
  });

  socket.on('disconnect', () => {
    const username = userStore.removeUserBySocketId(socket.id);
    rateLimiter.clearSocket(socket.id);

    if (!username) return;

    restrictionStore.clearAllForUser(username);
    requestStore.removeRequestsInvolving(username);
    roomStore.removeFromQueue(username);

    // Close any private/random rooms this user was part of and notify partners.
    roomStore.findRoomsForUser(username).forEach((room) => {
      closeRoomAndNotify(io, room, 'disconnected');
    });

    broadcastUserList(io);
    broadcastAdminStats(io);
    console.log(`[ChatFlow] ${username} disconnected. Online: ${userStore.getOnlineCount()}`);
  });
}

module.exports = { register, broadcastUserList, closeRoomAndNotify };
