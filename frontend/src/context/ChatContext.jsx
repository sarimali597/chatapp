import { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useUser } from './UserContext';
import { useNotifications } from './NotificationContext';
import { GLOBAL_ROOM, TYPING_IDLE_MS } from '../utils/constants';

const ChatContext = createContext(null);

const initialState = {
  onlineUsers: [],
  globalMessages: [],
  typingByScope: {}, // scope -> array of usernames currently typing
  incomingRequests: [], // [{ requestId, from }]
  outgoingRequest: null, // { requestId, to }
  rooms: {}, // roomId -> { id, type, partner, messages: [] }
  activeView: GLOBAL_ROOM,
  randomStatus: 'idle', // idle | searching
  restriction: { muted: false, muteExpiresAt: null, restricted: false, restrictExpiresAt: null },
};

function reducer(state, action) {
  switch (action.type) {
    case 'RESET':
      return initialState;

    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: action.users };

    case 'SET_GLOBAL_HISTORY':
      return { ...state, globalMessages: action.messages };

    case 'ADD_GLOBAL_MESSAGE':
      return { ...state, globalMessages: [...state.globalMessages, action.message] };

    case 'SET_TYPING': {
      const current = state.typingByScope[action.scope] || [];
      let next;
      if (action.isTyping) {
        next = current.includes(action.username) ? current : [...current, action.username];
      } else {
        next = current.filter((u) => u !== action.username);
      }
      return { ...state, typingByScope: { ...state.typingByScope, [action.scope]: next } };
    }

    case 'ADD_INCOMING_REQUEST':
      if (state.incomingRequests.some((r) => r.requestId === action.requestId)) return state;
      return {
        ...state,
        incomingRequests: [...state.incomingRequests, { requestId: action.requestId, from: action.from }],
      };

    case 'REMOVE_INCOMING_REQUEST':
      return {
        ...state,
        incomingRequests: state.incomingRequests.filter((r) => r.requestId !== action.requestId),
      };

    case 'SET_OUTGOING_REQUEST':
      return { ...state, outgoingRequest: { requestId: action.requestId, to: action.to } };

    case 'CLEAR_OUTGOING_REQUEST':
      return { ...state, outgoingRequest: null };

    case 'ADD_ROOM':
      return {
        ...state,
        rooms: {
          ...state.rooms,
          [action.room.id]: { ...action.room, messages: action.room.messages || [] },
        },
        activeView: action.room.id,
        randomStatus: 'idle',
      };

    case 'ADD_ROOM_MESSAGE': {
      const room = state.rooms[action.roomId];
      if (!room) return state;
      return {
        ...state,
        rooms: {
          ...state.rooms,
          [action.roomId]: { ...room, messages: [...room.messages, action.message] },
        },
      };
    }

    case 'MARK_ROOM_MESSAGES_SEEN': {
      const room = state.rooms[action.roomId];
      if (!room) return state;
      const idSet = new Set(action.messageIds);
      return {
        ...state,
        rooms: {
          ...state.rooms,
          [action.roomId]: {
            ...room,
            messages: room.messages.map((m) => (idSet.has(m.id) ? { ...m, status: 'seen' } : m)),
          },
        },
      };
    }

    case 'REMOVE_ROOM': {
      const { [action.roomId]: removed, ...restRooms } = state.rooms;
      return {
        ...state,
        rooms: restRooms,
        activeView: state.activeView === action.roomId ? GLOBAL_ROOM : state.activeView,
      };
    }

    case 'SET_ACTIVE_VIEW':
      return { ...state, activeView: action.view };

    case 'SET_RANDOM_STATUS':
      return { ...state, randomStatus: action.status };

    case 'SET_RESTRICTION':
      return { ...state, restriction: { ...state.restriction, ...action.patch } };

    default:
      return state;
  }
}

export function ChatProvider({ children }) {
  const { socket } = useSocket();
  const { username, setUsername, clearSession } = useUser();
  const { notify } = useNotifications();
  const [state, dispatch] = useReducer(reducer, initialState);
  const typingTimers = useRef(new Map()); // `${scope}:${username}` -> timeout id
  const hasJoinedRef = useRef(false);

  // --- Join flow ---
  const join = useCallback(
    (name) =>
      new Promise((resolve) => {
        socket.emit('user:join', { username: name }, (res) => {
          if (res && res.success) {
            hasJoinedRef.current = true;
            setUsername(res.user.username);
            dispatch({ type: 'SET_ONLINE_USERS', users: res.onlineUsers });
            dispatch({ type: 'SET_GLOBAL_HISTORY', messages: res.history });
          }
          resolve(res);
        });
      }),
    [socket, setUsername]
  );

  const logout = useCallback(() => {
    hasJoinedRef.current = false;
    socket.disconnect();
    dispatch({ type: 'RESET' });
    clearSession();
    socket.connect();
  }, [socket, clearSession]);

  // Re-establish the session automatically after a page refresh or a brief
  // network drop, as long as a username was already active this session.
  useEffect(() => {
    function attemptRejoin() {
      if (!username || hasJoinedRef.current) return;
      socket.emit('user:join', { username }, (res) => {
        if (res && res.success) {
          hasJoinedRef.current = true;
          dispatch({ type: 'SET_ONLINE_USERS', users: res.onlineUsers });
          dispatch({ type: 'SET_GLOBAL_HISTORY', messages: res.history });
        } else {
          // The username could not be reclaimed (e.g. taken while away).
          clearSession();
          dispatch({ type: 'RESET' });
        }
      });
    }

    socket.on('connect', attemptRejoin);
    if (socket.connected) attemptRejoin();

    return () => socket.off('connect', attemptRejoin);
  }, [socket, username, clearSession]);

  // --- Outgoing actions ---
  const sendGlobalMessage = useCallback(
    (text) => socket.emit('chat:message', { type: 'text', content: text }),
    [socket]
  );

  const sendGlobalImage = useCallback(
    (url) => socket.emit('chat:message', { type: 'image', content: url }),
    [socket]
  );

  const emitTyping = useCallback((scope, isTyping) => socket.emit('typing', { scope, isTyping }), [socket]);

  const sendPrivateRequest = useCallback((to) => socket.emit('private:request', { to }), [socket]);

  const respondToRequest = useCallback(
    (requestId, accept) => {
      socket.emit('private:request:respond', { requestId, accept });
      dispatch({ type: 'REMOVE_INCOMING_REQUEST', requestId });
    },
    [socket]
  );

  const sendRoomMessage = useCallback(
    (roomId, type, content) => socket.emit('room:message', { roomId, type, content }),
    [socket]
  );

  const focusView = useCallback((view) => {
    dispatch({ type: 'SET_ACTIVE_VIEW', view });
  }, []);

  const leaveRoom = useCallback((roomId) => socket.emit('room:leave', { roomId }), [socket]);

  const findRandom = useCallback(() => {
    dispatch({ type: 'SET_RANDOM_STATUS', status: 'searching' });
    socket.emit('random:find');
  }, [socket]);

  const cancelRandomSearch = useCallback(() => {
    dispatch({ type: 'SET_RANDOM_STATUS', status: 'idle' });
    socket.emit('random:cancel');
  }, [socket]);

  const skipRandom = useCallback(
    (roomId) => {
      dispatch({ type: 'SET_RANDOM_STATUS', status: 'searching' });
      socket.emit('random:skip', { roomId });
    },
    [socket]
  );

  // Keep the server's notion of "what is this user currently looking at" in
  // sync, whether the view changed manually or a room was auto-opened.
  useEffect(() => {
    socket.emit('room:focus', { roomId: state.activeView });
  }, [socket, state.activeView]);

  // --- Incoming socket events ---
  useEffect(() => {
    function onUsersUpdate({ users }) {
      dispatch({ type: 'SET_ONLINE_USERS', users });
    }

    function onChatMessage(message) {
      dispatch({ type: 'ADD_GLOBAL_MESSAGE', message });
    }

    function onTyping({ username: who, scope, isTyping }) {
      dispatch({ type: 'SET_TYPING', scope, username: who, isTyping });

      const key = `${scope}:${who}`;
      if (typingTimers.current.has(key)) {
        clearTimeout(typingTimers.current.get(key));
      }
      if (isTyping) {
        const timer = setTimeout(() => {
          dispatch({ type: 'SET_TYPING', scope, username: who, isTyping: false });
        }, TYPING_IDLE_MS + 1500);
        typingTimers.current.set(key, timer);
      }
    }

    function onRequestIncoming({ requestId, from }) {
      dispatch({ type: 'ADD_INCOMING_REQUEST', requestId, from });
    }

    function onRequestSent({ requestId, to }) {
      dispatch({ type: 'SET_OUTGOING_REQUEST', requestId, to });
    }

    function onRequestRejected({ by }) {
      dispatch({ type: 'CLEAR_OUTGOING_REQUEST' });
      notify({ title: 'Request declined', body: `${by} declined your chat request.`, variant: 'default' });
    }

    function onRoomCreated(room) {
      dispatch({ type: 'ADD_ROOM', room });
      dispatch({ type: 'CLEAR_OUTGOING_REQUEST' });
      notify({
        title: room.type === 'random' ? 'Random match found' : 'Request accepted',
        body: `You're now connected with ${room.partner}.`,
        variant: 'default',
      });
    }

    function onRoomMessage(message) {
      dispatch({ type: 'ADD_ROOM_MESSAGE', roomId: message.room, message });
    }

    function onRoomSeen({ roomId, messageIds }) {
      dispatch({ type: 'MARK_ROOM_MESSAGES_SEEN', roomId, messageIds });
    }

    function onRoomClosed({ roomId, reason }) {
      const reasonText = {
        left: 'The other person left the chat.',
        skipped: 'The other person skipped this chat.',
        disconnected: 'The other person disconnected.',
      }[reason] || 'This chat has ended.';
      notify({ title: 'Chat ended', body: reasonText, variant: 'default' });
      dispatch({ type: 'REMOVE_ROOM', roomId });
    }

    function onRandomWaiting() {
      dispatch({ type: 'SET_RANDOM_STATUS', status: 'searching' });
    }

    function onAccountMuted({ expiresAt }) {
      dispatch({ type: 'SET_RESTRICTION', patch: { muted: true, muteExpiresAt: expiresAt } });
      notify({ title: 'You have been muted', body: `You can chat again after ${new Date(expiresAt).toLocaleTimeString()}.`, variant: 'error' });
      const remaining = new Date(expiresAt).getTime() - Date.now();
      setTimeout(() => dispatch({ type: 'SET_RESTRICTION', patch: { muted: false, muteExpiresAt: null } }), Math.max(remaining, 0));
    }

    function onAccountRestricted({ expiresAt }) {
      dispatch({ type: 'SET_RESTRICTION', patch: { restricted: true, restrictExpiresAt: expiresAt } });
      notify({ title: 'You have been restricted', body: `Access restored after ${new Date(expiresAt).toLocaleTimeString()}.`, variant: 'error' });
      const remaining = new Date(expiresAt).getTime() - Date.now();
      setTimeout(() => dispatch({ type: 'SET_RESTRICTION', patch: { restricted: false, restrictExpiresAt: null } }), Math.max(remaining, 0));
    }

    function onDisconnectedByAdmin() {
      notify({ title: 'Disconnected', body: 'An administrator ended your session.', variant: 'error' });
      clearSession();
      dispatch({ type: 'RESET' });
    }

    function onActionError({ error }) {
      notify({ title: 'Action failed', body: error, variant: 'error' });
    }

    socket.on('users:update', onUsersUpdate);
    socket.on('chat:message', onChatMessage);
    socket.on('typing', onTyping);
    socket.on('private:request:incoming', onRequestIncoming);
    socket.on('private:request:sent', onRequestSent);
    socket.on('private:request:rejected', onRequestRejected);
    socket.on('room:created', onRoomCreated);
    socket.on('room:message', onRoomMessage);
    socket.on('room:seen', onRoomSeen);
    socket.on('room:closed', onRoomClosed);
    socket.on('random:waiting', onRandomWaiting);
    socket.on('account:muted', onAccountMuted);
    socket.on('account:restricted', onAccountRestricted);
    socket.on('account:disconnected-by-admin', onDisconnectedByAdmin);
    socket.on('action:error', onActionError);

    return () => {
      socket.off('users:update', onUsersUpdate);
      socket.off('chat:message', onChatMessage);
      socket.off('typing', onTyping);
      socket.off('private:request:incoming', onRequestIncoming);
      socket.off('private:request:sent', onRequestSent);
      socket.off('private:request:rejected', onRequestRejected);
      socket.off('room:created', onRoomCreated);
      socket.off('room:message', onRoomMessage);
      socket.off('room:seen', onRoomSeen);
      socket.off('room:closed', onRoomClosed);
      socket.off('random:waiting', onRandomWaiting);
      socket.off('account:muted', onAccountMuted);
      socket.off('account:restricted', onAccountRestricted);
      socket.off('account:disconnected-by-admin', onDisconnectedByAdmin);
      socket.off('action:error', onActionError);
    };
  }, [socket, notify, clearSession]);

  const value = {
    ...state,
    username,
    join,
    logout,
    sendGlobalMessage,
    sendGlobalImage,
    emitTyping,
    sendPrivateRequest,
    respondToRequest,
    sendRoomMessage,
    focusView,
    leaveRoom,
    findRandom,
    cancelRandomSearch,
    skipRandom,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
