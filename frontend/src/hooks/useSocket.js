import { useContext } from 'react';
import { SocketContext } from '../context/SocketContext.jsx';

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used inside a <SocketProvider>.');
  }
  return ctx;
}
