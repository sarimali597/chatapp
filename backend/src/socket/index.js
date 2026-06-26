const connectionHandler = require('./handlers/connectionHandler');
const chatHandler = require('./handlers/chatHandler');
const typingHandler = require('./handlers/typingHandler');
const privateChatHandler = require('./handlers/privateChatHandler');
const randomChatHandler = require('./handlers/randomChatHandler');
const { registerAdminNamespace } = require('./adminNamespace');

function initSocket(io) {
  io.on('connection', (socket) => {
    connectionHandler.register(io, socket);
    chatHandler.register(io, socket);
    typingHandler.register(io, socket);
    privateChatHandler.register(io, socket);
    randomChatHandler.register(io, socket);
  });

  registerAdminNamespace(io);
}

module.exports = initSocket;
