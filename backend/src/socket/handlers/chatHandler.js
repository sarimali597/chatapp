const userStore = require('../../utils/userStore');
const messageStore = require('../../utils/messageStore');
const restrictionStore = require('../../utils/restrictionStore');
const rateLimiter = require('../../utils/socketRateLimiter');
const { sanitizeText } = require('../../utils/sanitize');
const { isValidMessageText } = require('../../utils/validators');
const { generateId } = require('../../utils/idGenerator');
const { GLOBAL_ROOM } = require('../../config/constants');

function register(io, socket) {
  socket.on('chat:message', (payload) => {
    const username = socket.data.username;
    if (!username) return;

    if (restrictionStore.isMuted(username) || restrictionStore.isRestricted(username)) {
      return socket.emit('action:error', { error: 'You are currently restricted from chatting.' });
    }

    if (rateLimiter.isRateLimited(socket.id)) {
      return socket.emit('action:error', { error: 'You are sending messages too quickly. Please slow down.' });
    }

    const type = payload && payload.type === 'image' ? 'image' : 'text';
    let content = payload && payload.content;

    if (type === 'text') {
      if (!isValidMessageText(content)) return;
      content = sanitizeText(content);
    } else {
      if (typeof content !== 'string' || !content.startsWith('https://res.cloudinary.com')) {
        return socket.emit('action:error', { error: 'Invalid image content.' });
      }
    }

    const message = {
      id: generateId(),
      type,
      content,
      sender: username,
      room: GLOBAL_ROOM,
      timestamp: new Date().toISOString(),
    };

    messageStore.pushMessage(GLOBAL_ROOM, message);
    io.to(GLOBAL_ROOM).emit('chat:message', message);
  });
}

module.exports = { register };
