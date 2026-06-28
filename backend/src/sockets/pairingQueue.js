/**
 * FIFO waiting queue for "Find a partner" random 1:1 pairing.
 * Pairs the two longest-waiting users as soon as there are 2+ in line.
 */
class PairingQueue {
  constructor() {
    /** @type {{username: string, socketId: string}[]} */
    this.queue = [];
  }

  enqueue(username, socketId) {
    // Avoid duplicate entries if the client double-fires the event.
    if (this.queue.some((q) => q.socketId === socketId)) return;
    this.queue.push({ username, socketId });
  }

  remove(socketId) {
    this.queue = this.queue.filter((q) => q.socketId !== socketId);
  }

  isWaiting(socketId) {
    return this.queue.some((q) => q.socketId === socketId);
  }

  /** Pops the two oldest waiters, or returns null if fewer than 2 are waiting. */
  tryPair() {
    if (this.queue.length < 2) return null;
    const userA = this.queue.shift();
    const userB = this.queue.shift();
    return [userA, userB];
  }

  size() {
    return this.queue.length;
  }
}

module.exports = new PairingQueue();
