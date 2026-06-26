const { generateId } = require('./idGenerator');

const requests = new Map(); // requestId -> { id, from, to, createdAt }

function createRequest(from, to) {
  const id = generateId();
  const request = { id, from, to, createdAt: new Date().toISOString() };
  requests.set(id, request);
  return request;
}

function getRequest(requestId) {
  return requests.get(requestId) || null;
}

function deleteRequest(requestId) {
  return requests.delete(requestId);
}

function hasPendingRequestBetween(userA, userB) {
  return Array.from(requests.values()).some(
    (r) => (r.from === userA && r.to === userB) || (r.from === userB && r.to === userA)
  );
}

function removeRequestsInvolving(username) {
  for (const [id, req] of requests.entries()) {
    if (req.from === username || req.to === username) {
      requests.delete(id);
    }
  }
}

module.exports = {
  createRequest,
  getRequest,
  deleteRequest,
  hasPendingRequestBetween,
  removeRequestsInvolving,
};
