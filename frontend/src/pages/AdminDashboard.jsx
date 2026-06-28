import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { LogOut, ShieldAlert, Users2, Ban, UserX, DoorClosed, RefreshCcw } from 'lucide-react';
import AdminLogin from '../components/AdminLogin.jsx';
import AdminRoomCard from '../components/AdminRoomCard.jsx';
import ChatBubble from '../components/ChatBubble.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const TOKEN_KEY = 'chatflow_admin_token';
const MAX_MESSAGES_PER_ROOM = 300; // memory only, per room, for this browser tab's lifetime

export default function AdminDashboard() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [connected, setConnected] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [view, setView] = useState('rooms'); // 'rooms' | 'bans'
  const [bans, setBans] = useState([]);
  const [bansLoading, setBansLoading] = useState(false);
  const [confirmBan, setConfirmBan] = useState(null); // username pending a second confirm click

  // roomId -> message[]. Lives only in this tab's memory. A refresh of
  // this very dashboard wipes it too — that's the point.
  const messagesByRoomRef = useRef(new Map());
  const [, forceTick] = useState(0); // cheap re-render trigger when the ref's contents change
  const socketRef = useRef(null);

  const logout = useCallback(() => {
    socketRef.current?.disconnect();
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setConnected(false);
    setRooms([]);
    messagesByRoomRef.current = new Map();
  }, []);

  useEffect(() => {
    if (!token) return;

    const socket = io(`${SOCKET_URL}/admin`, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setAuthError(null);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      setConnected(false);
      setAuthError(err.message || 'Could not connect.');
      if (err.message?.toLowerCase().includes('token')) {
        logout();
      }
    });

    socket.on('rooms-update', (roomList) => {
      setRooms(roomList);
    });

    socket.on('new-message', (msg) => {
      const existing = messagesByRoomRef.current.get(msg.roomId) || [];
      const next = [...existing, msg];
      messagesByRoomRef.current.set(
        msg.roomId,
        next.length > MAX_MESSAGES_PER_ROOM ? next.slice(-MAX_MESSAGES_PER_ROOM) : next
      );
      forceTick((t) => t + 1);
    });

    return () => socket.disconnect();
  }, [token, logout]);

  useEffect(() => {
    if (!token || view !== 'bans') return;
    loadBans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, view]);

  async function loadBans() {
    setBansLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/bans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBans(data.bans || []);
    } catch {
      setBans([]);
    } finally {
      setBansLoading(false);
    }
  }

  async function liftBan(ip) {
    await fetch(`${API_URL}/api/admin/bans/${encodeURIComponent(ip)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadBans();
  }

  function kickUser(username) {
    socketRef.current?.emit('kick-user', { username }, () => {});
  }

  function banUser(username) {
    if (confirmBan !== username) {
      setConfirmBan(username);
      return;
    }
    socketRef.current?.emit('ban-ip', { username, reason: 'Banned by admin' }, () => {});
    setConfirmBan(null);
  }

  function endRoom(roomId) {
    socketRef.current?.emit('end-room', { roomId }, () => {});
    if (selectedRoomId === roomId) setSelectedRoomId(null);
  }

  if (!token) {
    return (
      <AdminLogin
        onLogin={(t) => {
          localStorage.setItem(TOKEN_KEY, t);
          setToken(t);
        }}
      />
    );
  }

  const selectedRoom = rooms.find((r) => r.roomId === selectedRoomId);
  const selectedMessages = selectedRoomId ? messagesByRoomRef.current.get(selectedRoomId) || [] : [];

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-white/10 bg-ink-black px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-5 text-ocean-mist-light" />
          <h1 className="font-display text-sm font-semibold text-white">ChatFlow Admin</h1>
          <span
            className={`ml-2 size-1.5 rounded-full ${connected ? 'bg-ocean-mist-light' : 'bg-red-500'}`}
            title={connected ? 'Connected' : 'Disconnected'}
          />
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/5"
        >
          <LogOut className="size-3.5" /> Sign out
        </button>
      </header>

      {authError && <p className="bg-red-500/10 px-4 py-2 text-xs text-red-300">{authError}</p>}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="scroll-thin w-72 shrink-0 overflow-y-auto border-r border-white/10 bg-jet-black/40 p-3">
          <div className="mb-3 flex gap-1.5 rounded-full bg-jet-black p-1">
            <button
              onClick={() => setView('rooms')}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                view === 'rooms' ? 'bg-royal-blue text-white' : 'text-white/55 hover:text-white'
              }`}
            >
              Rooms
            </button>
            <button
              onClick={() => setView('bans')}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                view === 'bans' ? 'bg-royal-blue text-white' : 'text-white/55 hover:text-white'
              }`}
            >
              Banned IPs
            </button>
          </div>

          {view === 'rooms' && (
            <div className="flex flex-col gap-2">
              {rooms.map((room) => (
                <AdminRoomCard
                  key={room.roomId}
                  room={room}
                  isSelected={room.roomId === selectedRoomId}
                  onSelect={setSelectedRoomId}
                />
              ))}
              {rooms.length === 0 && <p className="px-2 text-xs text-white/40">No active rooms yet.</p>}
            </div>
          )}

          {view === 'bans' && (
            <div className="flex flex-col gap-2">
              <button
                onClick={loadBans}
                className="mb-1 flex items-center gap-1.5 self-end text-xs text-white/45 hover:text-white"
              >
                <RefreshCcw className="size-3" /> Refresh
              </button>
              {bansLoading && <p className="px-2 text-xs text-white/40">Loading…</p>}
              {!bansLoading && bans.length === 0 && (
                <p className="px-2 text-xs text-white/40">No banned IPs.</p>
              )}
              {bans.map((ban) => (
                <div key={ban.ip} className="rounded-xl border border-white/10 p-2.5">
                  <p className="text-sm text-white/85">{ban.ip}</p>
                  <p className="mt-0.5 text-[11px] text-white/40">
                    {ban.bannedUsername ? `was "${ban.bannedUsername}" · ` : ''}
                    {ban.reason}
                  </p>
                  <button
                    onClick={() => liftBan(ban.ip)}
                    className="mt-1.5 text-xs font-medium text-ocean-mist-light hover:underline"
                  >
                    Lift ban
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Main panel */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {!selectedRoom && (
            <div className="flex flex-1 items-center justify-center text-sm text-white/40">
              <div className="text-center">
                <Users2 className="mx-auto mb-2 size-6 text-white/25" />
                Select a room to watch it live.
                <br />
                Nothing here is ever saved — this view empties the moment you refresh.
              </div>
            </div>
          )}

          {selectedRoom && (
            <>
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedRoom.participants.map((p) => (
                    <span key={p} className="flex items-center gap-1 rounded-full bg-jet-black px-2.5 py-1 text-xs text-white/80">
                      {p}
                      <button onClick={() => kickUser(p)} title={`Kick ${p}`} className="hover:text-red-400">
                        <UserX className="size-3" />
                      </button>
                      <button
                        onClick={() => banUser(p)}
                        title={`Ban ${p}`}
                        className={`hover:text-red-400 ${confirmBan === p ? 'text-red-400' : ''}`}
                      >
                        <Ban className="size-3" />
                      </button>
                    </span>
                  ))}
                  {confirmBan && (
                    <span className="text-[11px] text-red-300">Click ban again on {confirmBan} to confirm.</span>
                  )}
                </div>
                {selectedRoom.type !== 'group' && (
                  <button
                    onClick={() => endRoom(selectedRoom.roomId)}
                    className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/5"
                  >
                    <DoorClosed className="size-3.5" /> End room
                  </button>
                )}
              </div>

              <div className="scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {selectedMessages.length === 0 && (
                  <p className="pt-10 text-center text-sm text-white/40">
                    Watching live — messages will appear here as they're sent.
                  </p>
                )}
                {selectedMessages.map((msg, i) => (
                  <ChatBubble key={`${msg.timestamp}-${i}`} message={msg} isOwn={false} showAuthor />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
