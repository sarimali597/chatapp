const userStore = require('./userStore');

// Tracks active expiry timers so they can be inspected/cleared if needed.
const activeTimers = new Map(); // `${username}:${type}` -> Timeout

function applyRestriction(username, type, durationMs, reason) {
  const user = userStore.getUserByUsername(username);
  if (!user) return null;

  const expiresAt = new Date(Date.now() + durationMs).toISOString();
  const key = `${username}:${type}`;

  // Clear any existing timer of the same type so durations don't stack.
  if (activeTimers.has(key)) {
    clearTimeout(activeTimers.get(key));
  }

  if (type === 'mute') {
    userStore.updateUser(username, { isMuted: true, muteExpiresAt: expiresAt, muteReason: reason || null });
  } else if (type === 'restrict') {
    userStore.updateUser(username, { isRestricted: true, restrictExpiresAt: expiresAt, restrictReason: reason || null });
  }

  const timer = setTimeout(() => {
    liftRestriction(username, type);
    activeTimers.delete(key);
  }, durationMs);

  activeTimers.set(key, timer);

  return { username, type, expiresAt };
}

function liftRestriction(username, type) {
  const user = userStore.getUserByUsername(username);
  if (!user) return;

  if (type === 'mute') {
    userStore.updateUser(username, { isMuted: false, muteExpiresAt: null, muteReason: null });
  } else if (type === 'restrict') {
    userStore.updateUser(username, { isRestricted: false, restrictExpiresAt: null, restrictReason: null });
  }
}

function clearAllForUser(username) {
  ['mute', 'restrict'].forEach((type) => {
    const key = `${username}:${type}`;
    if (activeTimers.has(key)) {
      clearTimeout(activeTimers.get(key));
      activeTimers.delete(key);
    }
  });
}

function isMuted(username) {
  const user = userStore.getUserByUsername(username);
  return !!user && !!user.isMuted;
}

function isRestricted(username) {
  const user = userStore.getUserByUsername(username);
  return !!user && !!user.isRestricted;
}

module.exports = {
  applyRestriction,
  liftRestriction,
  clearAllForUser,
  isMuted,
  isRestricted,
};
