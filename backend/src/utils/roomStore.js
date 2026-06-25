const { generateId } = require('./idGenerator');

const rooms = new Map(); // roomId -> { id, type, participants: [a,b], createdAt }
const randomQueue = []; // array of usernames waiting for a random match

function createRoom(type, participants) {
  const id = generateId();
  const room = {
    id,
    type, // 'private' | 'random'
    participants,
    createdAt: new Date().toISOString(),
  };
  rooms.set(id, room);
  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

function deleteRoom(roomId) {
  return rooms.delete(roomId);
}

function getAllRooms() {
  return Array.from(rooms.values());
}

function findRoomsForUser(username) {
  return Array.from(rooms.values()).filter((r) => r.participants.includes(username));
}

function isParticipant(roomId, username) {
  const room = rooms.get(roomId);
  return !!room && room.participants.includes(username);
}

// --- Random matchmaking queue ---

function addToQueue(username) {
  if (!randomQueue.includes(username)) {
    randomQueue.push(username);
  }
}

function removeFromQueue(username) {
  const idx = randomQueue.indexOf(username);
  if (idx !== -1) randomQueue.splice(idx, 1);
}

function popNextMatch(excludeUsername) {
  const idx = randomQueue.findIndex((u) => u !== excludeUsername);
  if (idx === -1) return null;
  return randomQueue.splice(idx, 1)[0];
}

function isInQueue(username) {
  return randomQueue.includes(username);
}

function getQueueLength() {
  return randomQueue.length;
}

module.exports = {
  createRoom,
  getRoom,
  deleteRoom,
  getAllRooms,
  findRoomsForUser,
  isParticipant,
  addToQueue,
  removeFromQueue,
  popNextMatch,
  isInQueue,
  getQueueLength,
};
