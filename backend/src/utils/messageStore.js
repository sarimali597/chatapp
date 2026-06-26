const { GLOBAL_ROOM, MAX_GLOBAL_HISTORY, MAX_PRIVATE_HISTORY } = require('../config/constants');

const historyByRoom = new Map(); // roomId -> array of message objects

function getHistory(roomId) {
  return historyByRoom.get(roomId) || [];
}

function pushMessage(roomId, message) {
  const list = historyByRoom.get(roomId) || [];
  list.push(message);

  const cap = roomId === GLOBAL_ROOM ? MAX_GLOBAL_HISTORY : MAX_PRIVATE_HISTORY;
  if (list.length > cap) {
    list.splice(0, list.length - cap);
  }

  historyByRoom.set(roomId, list);
  return message;
}

function updateMessageStatus(roomId, messageId, status) {
  const list = historyByRoom.get(roomId);
  if (!list) return null;
  const msg = list.find((m) => m.id === messageId);
  if (msg) msg.status = status;
  return msg || null;
}

function markAllSeen(roomId, viewerUsername) {
  const list = historyByRoom.get(roomId);
  if (!list) return [];
  const updated = [];
  list.forEach((m) => {
    if (m.sender !== viewerUsername && m.status !== 'seen') {
      m.status = 'seen';
      updated.push(m);
    }
  });
  return updated;
}

function clearRoomHistory(roomId) {
  historyByRoom.delete(roomId);
}

module.exports = {
  getHistory,
  pushMessage,
  updateMessageStatus,
  markAllSeen,
  clearRoomHistory,
};
