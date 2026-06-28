const { registerUserNamespace } = require('./userNamespace');
const registerAdminNamespace = require('./adminNamespace');

function registerSockets(io) {
  registerUserNamespace(io); // default namespace "/" — regular chat users
  registerAdminNamespace(io); // "/admin" namespace — dashboard observers
}

module.exports = registerSockets;
