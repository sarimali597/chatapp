const jwt = require('jsonwebtoken');
const userStore = require('../utils/userStore');
const roomStore = require('../utils/roomStore');
const restrictionStore = require('../utils/restrictionStore');
const { broadcastAdminStats } = require('../socket/adminNamespace');

const DURATION_PRESETS_MS = {
  '10m': 10 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
};

function login(req, res) {
  const { username, password } = req.body || {};

  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  const token = jwt.sign({ role: 'admin', username }, process.env.ADMIN_JWT_SECRET, {
    expiresIn: process.env.ADMIN_TOKEN_EXPIRY || '12h',
  });

  return res.status(200).json({ token });
}

function getStats(req, res) {
  const rooms = roomStore.getAllRooms();
  res.status(200).json({
    onlineUsers: userStore.getOnlineCount(),
    privateRooms: rooms.filter((r) => r.type === 'private').length,
    randomRooms: rooms.filter((r) => r.type === 'random').length,
    queueLength: roomStore.getQueueLength(),
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}

function getUsers(req, res) {
  const users = userStore.getAllUsers().map(userStore.toAdminUser);
  res.status(200).json({ users });
}

function getRooms(req, res) {
  // Only metadata is ever exposed: participants and timestamps. No message
  // content is stored on the room object, so none can leak here.
  const rooms = roomStore.getAllRooms().map((r) => ({
    id: r.id,
    type: r.type,
    participants: r.participants,
    createdAt: r.createdAt,
  }));
  res.status(200).json({ rooms });
}

function muteUser(req, res) {
  const { username, duration } = req.body || {};
  const ms = DURATION_PRESETS_MS[duration];

  if (!username || !ms) {
    return res.status(400).json({ error: 'A valid username and duration (10m, 1h, 24h) are required.' });
  }

  const user = userStore.getUserByUsername(username);
  if (!user) {
    return res.status(404).json({ error: 'User is not currently online.' });
  }

  const result = restrictionStore.applyRestriction(username, 'mute', ms, req.body.reason);

  req.io.to(user.socketId).emit('account:muted', { expiresAt: result.expiresAt });
  broadcastAdminStats(req.io);

  res.status(200).json({ message: `${username} has been muted until ${result.expiresAt}.`, ...result });
}

function restrictUser(req, res) {
  const { username, duration } = req.body || {};
  const ms = DURATION_PRESETS_MS[duration];

  if (!username || !ms) {
    return res.status(400).json({ error: 'A valid username and duration (10m, 1h, 24h) are required.' });
  }

  const user = userStore.getUserByUsername(username);
  if (!user) {
    return res.status(404).json({ error: 'User is not currently online.' });
  }

  const result = restrictionStore.applyRestriction(username, 'restrict', ms, req.body.reason);

  req.io.to(user.socketId).emit('account:restricted', { expiresAt: result.expiresAt });
  broadcastAdminStats(req.io);

  res.status(200).json({ message: `${username} has been restricted until ${result.expiresAt}.`, ...result });
}

function disconnectUser(req, res) {
  const { username } = req.body || {};
  const user = userStore.getUserByUsername(username);

  if (!user) {
    return res.status(404).json({ error: 'User is not currently online.' });
  }

  const socket = req.io.sockets.sockets.get(user.socketId);
  if (socket) {
    socket.emit('account:disconnected-by-admin');
    socket.disconnect(true);
  }

  broadcastAdminStats(req.io);
  res.status(200).json({ message: `${username} has been disconnected.` });
}

module.exports = {
  login,
  getStats,
  getUsers,
  getRooms,
  muteUser,
  restrictUser,
  disconnectUser,
};
