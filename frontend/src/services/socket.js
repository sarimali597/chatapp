import { io } from 'socket.io-client';
import { API_URL } from './api';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

let adminSocket = null;

export function getAdminSocket(token) {
  if (adminSocket) {
    adminSocket.disconnect();
  }
  adminSocket = io(`${API_URL}/admin`, {
    autoConnect: false,
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  return adminSocket;
}

export function disconnectAdminSocket() {
  if (adminSocket) {
    adminSocket.disconnect();
    adminSocket = null;
  }
}
