import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

// autoConnect is off so we only open the socket once the visitor has
// picked a username (see App.jsx / JoinScreen.jsx).
export const socket = io(SERVER_URL, {
  autoConnect: false,
});
