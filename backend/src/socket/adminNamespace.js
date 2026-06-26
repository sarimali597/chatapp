const jwt = require('jsonwebtoken');
const userStore = require('../utils/userStore');
const roomStore = require('../utils/roomStore');

function buildSnapshot() {
  return {
    stats: {
      onlineUsers: userStore.getOnlineCount(),
      privateRooms: roomStore.getAllRooms().filter((r) => r.type === 'private').length,
      randomRooms: roomStore.getAllRooms().filter((r) => r.type === 'random').length,
      queueLength: roomStore.getQueueLength(),
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    users: userStore.getAllUsers().map(userStore.toAdminUser),
    rooms: roomStore.getAllRooms().map((r) => ({
      id: r.id,
      type: r.type,
      participants: r.participants,
      createdAt: r.createdAt,
    })),
  };
}

function broadcastAdminStats(io) {
  const adminNs = io.of('/admin');
  adminNs.emit('admin:snapshot', buildSnapshot());
}

function registerAdminNamespace(io) {
  const adminNs = io.of('/admin');

  adminNs.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('Admin authentication required.'));

    try {
      const payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
      if (payload.role !== 'admin') return next(new Error('Invalid admin session.'));
      socket.admin = payload;
      next();
    } catch (err) {
      next(new Error('Invalid or expired admin session.'));
    }
  });

  adminNs.on('connection', (socket) => {
    socket.emit('admin:snapshot', buildSnapshot());

    socket.on('admin:refresh', () => {
      socket.emit('admin:snapshot', buildSnapshot());
    });
  });
}

module.exports = { registerAdminNamespace, broadcastAdminStats };
