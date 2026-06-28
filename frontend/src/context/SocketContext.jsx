import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

export const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * One socket connection for the whole app lifetime. Render's free tier
 * sleeps after ~15 min idle, so the first connect after a sleep can take
 * 30-50s — connectionStatus surfaces that instead of looking broken.
 */
export function SocketProvider({ children }) {
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting | connected | disconnected | banned | error
  const [connectionError, setConnectionError] = useState(null);
  const [username, setUsernameState] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [notice, setNotice] = useState(null); // { type: 'info'|'error', message }

  const socketRef = useRef(null);
  const usernameRef = useRef(null); // avoids stale closures inside listeners registered once
  const navigate = useNavigate();

  const setUsername = useCallback((name) => {
    usernameRef.current = name;
    setUsernameState(name);
  }, []);

  const showNotice = useCallback((type, message) => {
    setNotice({ type, message, key: Date.now() });
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      setConnectionError(null);

      // Reconnects get a brand-new socket id server-side, so a
      // previously-claimed username needs to be silently re-claimed.
      if (usernameRef.current) {
        socket.emit('join', usernameRef.current, (res) => {
          if (!res?.success) {
            showNotice('error', "Your session expired and that username was taken — please rejoin.");
            setUsername(null);
            navigate('/');
          }
        });
      }
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (err) => {
      if (err.message === 'banned') {
        setConnectionStatus('banned');
        setConnectionError(err.data?.reason || 'You have been banned from ChatFlow.');
        socket.disconnect();
      } else {
        setConnectionStatus('error');
      }
    });

    socket.on('active-users-update', (usernames) => {
      setActiveUsers(usernames);
    });

    socket.on('incoming-request', ({ requestId, fromUsername }) => {
      setIncomingRequest({ requestId, fromUsername });
    });

    socket.on('paired', ({ roomId, partner }) => {
      setIncomingRequest(null);
      navigate(`/room/${roomId}`, { state: { partner, mode: 'paired' } });
    });

    socket.on('request-accepted', ({ roomId, partner }) => {
      setIncomingRequest(null);
      navigate(`/room/${roomId}`, { state: { partner, mode: 'direct' } });
    });

    socket.on('request-declined', ({ targetUsername, reason }) => {
      showNotice(
        'info',
        reason === 'timed-out'
          ? `${targetUsername} didn't respond in time.`
          : `${targetUsername} declined your chat request.`
      );
    });

    socket.on('kicked', ({ reason }) => {
      showNotice('error', reason || 'You were removed by an administrator.');
      setUsername(null);
      navigate('/');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Actions: each wraps an emit + ack callback as a Promise ------
  const emitWithAck = useCallback((event, payload) => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected) {
        resolve({ success: false, error: 'Not connected to the server.' });
        return;
      }
      socket.emit(event, payload, (res) => resolve(res || { success: false, error: 'No response from server.' }));
    });
  }, []);

  const checkUsernameAvailability = useCallback(
    (name) =>
      new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket || !socket.connected) {
          resolve({ available: false, reason: 'Not connected to the server.' });
          return;
        }
        socket.emit('check-username', name, (res) => resolve(res));
      }),
    []
  );

  const joinAsUsername = useCallback(
    (name) =>
      new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket || !socket.connected) {
          resolve({ success: false, error: 'Not connected to the server.' });
          return;
        }
        socket.emit('join', name, (res) => {
          if (res?.success) setUsername(res.username);
          resolve(res);
        });
      }),
    [setUsername]
  );

  const findPartner = useCallback(() => emitWithAck('find-partner', {}), [emitWithAck]);
  const leaveQueue = useCallback(() => emitWithAck('leave-queue', {}), [emitWithAck]);
  const requestChat = useCallback(
    (targetUsername) => emitWithAck('request-chat', { targetUsername }),
    [emitWithAck]
  );
  const respondToRequest = useCallback(
    (requestId, accept) => {
      setIncomingRequest(null);
      return emitWithAck('respond-request', { requestId, accept });
    },
    [emitWithAck]
  );
  const sendMessage = useCallback(
    (roomId, type, content, durationSeconds) =>
      emitWithAck('send-message', { roomId, type, content, durationSeconds }),
    [emitWithAck]
  );
  const leaveRoom = useCallback((roomId) => emitWithAck('leave-room', { roomId }), [emitWithAck]);
  const setTyping = useCallback((roomId, isTyping) => {
    socketRef.current?.emit('typing', { roomId, isTyping });
  }, []);

  const value = {
    socket: socketRef.current,
    connectionStatus,
    connectionError,
    username,
    activeUsers,
    incomingRequest,
    notice,
    clearNotice: () => setNotice(null),
    checkUsernameAvailability,
    joinAsUsername,
    findPartner,
    leaveQueue,
    requestChat,
    respondToRequest,
    sendMessage,
    leaveRoom,
    setTyping,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
