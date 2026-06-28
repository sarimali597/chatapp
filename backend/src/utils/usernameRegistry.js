/**
 * Tracks which usernames are currently "taken" by an active connection.
 * Nothing here touches the database — usernames are purely in-memory
 * and vanish when the process restarts, by design (no permanent
 * accounts, per the ChatFlow spec).
 *
 * Grace window: when a socket disconnects, we don't free the username
 * immediately. A short timer gives accidental refreshes / flaky mobile
 * connections a chance to reconnect under the same name before someone
 * else can grab it.
 */

const GRACE_MS = (Number(process.env.USERNAME_GRACE_SECONDS) || 8) * 1000;

class UsernameRegistry {
  constructor() {
    /** @type {Map<string, string>} normalizedUsername -> socketId */
    this.activeByName = new Map();
    /** @type {Map<string, string>} socketId -> display username (original casing) */
    this.usernameBySocket = new Map();
    /** @type {Map<string, NodeJS.Timeout>} normalizedUsername -> release timer */
    this.pendingRelease = new Map();
  }

  normalize(username) {
    return username.trim().toLowerCase();
  }

  isValidFormat(username) {
    if (typeof username !== 'string') return false;
    const trimmed = username.trim();
    // 2-20 chars, letters/numbers/underscore/hyphen only — keeps it
    // safe to render and to use as a Socket.IO room/identifier.
    return /^[a-zA-Z0-9_-]{2,20}$/.test(trimmed);
  }

  isAvailable(username) {
    if (!this.isValidFormat(username)) return false;
    const key = this.normalize(username);
    return !this.activeByName.has(key);
  }

  /**
   * Claims a username for a socket. Returns the display name on
   * success, or throws with a user-facing reason on failure.
   */
  claim(username, socketId) {
    if (!this.isValidFormat(username)) {
      throw new Error('Username must be 2-20 characters: letters, numbers, _ or - only.');
    }
    const key = this.normalize(username);
    if (this.activeByName.has(key)) {
      throw new Error('That username is already taken.');
    }

    // If a release timer is pending for this exact name (recent
    // disconnect), cancel it — this socket is claiming it fresh.
    this.cancelPendingRelease(key);

    const display = username.trim();
    this.activeByName.set(key, socketId);
    this.usernameBySocket.set(socketId, display);
    return display;
  }

  getUsername(socketId) {
    return this.usernameBySocket.get(socketId) || null;
  }

  getSocketId(username) {
    return this.activeByName.get(this.normalize(username)) || null;
  }

  isOnline(username) {
    return this.activeByName.has(this.normalize(username));
  }

  listActiveUsernames(excludeSocketId) {
    const names = [];
    for (const [socketId, display] of this.usernameBySocket.entries()) {
      if (socketId !== excludeSocketId) names.push(display);
    }
    return names;
  }

  /**
   * Called on socket disconnect. Frees the username after GRACE_MS
   * unless the same socketId is still mapped (i.e. nothing reclaimed
   * it in the meantime) — keyed by socketId so a fast reconnect+reclaim
   * under a different socket doesn't get wiped by a stale timer.
   */
  scheduleRelease(socketId) {
    const display = this.usernameBySocket.get(socketId);
    if (!display) return;
    const key = this.normalize(display);

    const timer = setTimeout(() => {
      // Only release if this socketId is still the owner — if the user
      // reconnected and re-claimed under a new socket, claim() already
      // cancelled this timer, but guard anyway for safety.
      if (this.activeByName.get(key) === socketId) {
        this.activeByName.delete(key);
        this.usernameBySocket.delete(socketId);
      }
      this.pendingRelease.delete(key);
    }, GRACE_MS);

    this.pendingRelease.set(key, timer);
  }

  cancelPendingRelease(key) {
    const timer = this.pendingRelease.get(key);
    if (timer) {
      clearTimeout(timer);
      this.pendingRelease.delete(key);
    }
  }

  /** Immediate removal — used for admin kicks, not normal disconnects. */
  forceRelease(socketId) {
    const display = this.usernameBySocket.get(socketId);
    if (!display) return;
    const key = this.normalize(display);
    this.cancelPendingRelease(key);
    this.activeByName.delete(key);
    this.usernameBySocket.delete(socketId);
  }
}

module.exports = new UsernameRegistry();
