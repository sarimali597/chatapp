import { createContext, useContext, useEffect, useState } from 'react';
import { getSocket } from '../services/socket';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket] = useState(() => getSocket());
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    function handleConnect() {
      setConnected(true);
    }
    function handleDisconnect() {
      setConnected(false);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  function reconnect() {
    if (!socket.connected) socket.connect();
  }

  return (
    <SocketContext.Provider value={{ socket, connected, reconnect }}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
