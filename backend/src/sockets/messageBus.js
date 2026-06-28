const { EventEmitter } = require('events');

/**
 * The entire mechanism behind "admin sees live convo but nothing is
 * ever saved": every sent message is emitted here once, in passing.
 * If an admin socket is connected, it's listening and relays it to the
 * dashboard instantly. If not, the event has zero listeners and the
 * message disappears exactly like it does for everyone else — there is
 * no buffer, queue, or persistence layer backing this.
 */
module.exports = new EventEmitter();
