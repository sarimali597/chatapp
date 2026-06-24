import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "https://chatapp-aa9g.onrender.com/";

// autoConnect is off so we only open the socket once the visitor has
// picked a username (see App.jsx / JoinScreen.jsx).
export const socket = io(SERVER_URL, {
  autoConnect: false,
});
