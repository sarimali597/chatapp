const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');

/**
 * Tracks every active private room (1:1, regardless of whether it came
 * from random pairing or a direct request) plus the one shared group
 * room ("lobby"). Emits lifecycle events so the admin namespace can
 * auto-join rooms for live observation without any other module
 * needing to know the admin namespace exists.
 *
 * Nothing here ever stores message content — only room/participant
 * metadata, which is exactly what the admin dashboard's room list needs.
 */
class RoomManager extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, {roomId: string, type: 'group'|'paired'|'direct', participants: {username: string, socketId: string}[], createdAt: number}>} */
    this.rooms = new Map();

    // The single shared group chat room always exists.
    this.rooms.set('lobby', {
      roomId: 'lobby',
      type: 'group',
      participants: [],
      createdAt: Date.now(),
    });
  }

  createPrivateRoom(type, userA, userB) {
    const roomId = `${type}-${nanoid(10)}`;
    const room = {
      roomId,
      type, // 'paired' | 'direct'
      participants: [userA, userB],
      createdAt: Date.now(),
    };
    this.rooms.set(roomId, room);
    this.emit('room-created', room);
    return room;
  }

  addParticipant(roomId, participant) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    room.participants.push(participant);
    this.emit('room-updated', room);
    return room;
  }

  removeParticipantBySocket(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    room.participants = room.participants.filter((p) => p.socketId !== socketId);
    this.emit('room-updated', room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  /** Finds every private room a given socket is currently part of. */
  findRoomsBySocket(socketId) {
    const result = [];
    for (const room of this.rooms.values()) {
      if (room.type === 'group') continue;
      if (room.participants.some((p) => p.socketId === socketId)) {
        result.push(room);
      }
    }
    return result;
  }

  endRoom(roomId, reason) {
    if (roomId === 'lobby') return; // the group room is never torn down
    const room = this.rooms.get(roomId);
    if (!room) return;
    this.rooms.delete(roomId);
    this.emit('room-ended', { ...room, reason });
  }

  /** Snapshot for the admin dashboard's room list. */
  listRoomsForAdmin() {
    return Array.from(this.rooms.values()).map((r) => ({
      roomId: r.roomId,
      type: r.type,
      participants: r.participants.map((p) => p.username),
      createdAt: r.createdAt,
    }));
  }
}

module.exports = new RoomManager();
