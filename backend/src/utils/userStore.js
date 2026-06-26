/**
 * In-memory store of currently online users.
 * No database is used by design — usernames and presence only ever live in
 * process memory and disappear the moment a user disconnects.
 */

const usersByUsername = new Map(); // username -> userRecord
const usernameBySocketId = new Map(); // socketId -> username

function addUser(username, socketId) {
  const record = {
    username,
    socketId,
    status: 'online',
    joinedAt: new Date().toISOString(),
    currentView: 'global', // 'global' | roomId
    isMuted: false,
    muteExpiresAt: null,
    isRestricted: false,
    restrictExpiresAt: null,
  };
  usersByUsername.set(username, record);
  usernameBySocketId.set(socketId, username);
  return record;
}

function removeUserBySocketId(socketId) {
  const username = usernameBySocketId.get(socketId);
  if (!username) return null;
  usernameBySocketId.delete(socketId);
  usersByUsername.delete(username);
  return username;
}

function removeUserByUsername(username) {
  const record = usersByUsername.get(username);
  if (!record) return null;
  usernameBySocketId.delete(record.socketId);
  usersByUsername.delete(username);
  return record;
}

function getUserByUsername(username) {
  return usersByUsername.get(username) || null;
}

function getUserBySocketId(socketId) {
  const username = usernameBySocketId.get(socketId);
  return username ? usersByUsername.get(username) : null;
}

function isUsernameTaken(username) {
  return usersByUsername.has(username);
}

function getAllUsers() {
  return Array.from(usersByUsername.values());
}

function getOnlineCount() {
  return usersByUsername.size;
}

function updateUser(username, patch) {
  const record = usersByUsername.get(username);
  if (!record) return null;
  Object.assign(record, patch);
  return record;
}

function setCurrentView(username, view) {
  return updateUser(username, { currentView: view });
}

function toPublicUser(record) {
  if (!record) return null;
  return {
    username: record.username,
    status: record.status,
    joinedAt: record.joinedAt,
  };
}

function toAdminUser(record) {
  if (!record) return null;
  return {
    username: record.username,
    status: record.status,
    joinedAt: record.joinedAt,
    socketId: record.socketId,
    currentView: record.currentView,
    isMuted: record.isMuted,
    muteExpiresAt: record.muteExpiresAt,
    isRestricted: record.isRestricted,
    restrictExpiresAt: record.restrictExpiresAt,
  };
}

module.exports = {
  addUser,
  removeUserBySocketId,
  removeUserByUsername,
  getUserByUsername,
  getUserBySocketId,
  isUsernameTaken,
  getAllUsers,
  getOnlineCount,
  updateUser,
  setCurrentView,
  toPublicUser,
  toAdminUser,
};
