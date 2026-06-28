import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, LogOut, Shuffle, UserRound } from 'lucide-react';
import { useSocket } from '../hooks/useSocket.js';
import ChatBubble from '../components/ChatBubble.jsx';
import MessageInput from '../components/MessageInput.jsx';

export default function OneOnOne() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, username, leaveRoom } = useSocket();

  const MAX_MESSAGES_KEPT = 500; // memory only — nothing here is ever persisted

  const [partner, setPartner] = useState(location.state?.partner || null);
  const [mode, setMode] = useState(location.state?.mode || null); // 'paired' | 'direct'
  const [messages, setMessages] = useState([]);
  const [typingPartner, setTypingPartner] = useState(false);
  const [status, setStatus] = useState('active'); // active | requeuing | ended
  const [endReason, setEndReason] = useState(null);
  const bottomRef = useRef(null);

  // Fresh room = fresh state. Nothing carries over between rooms.
  useEffect(() => {
    setPartner(location.state?.partner || null);
    setMode(location.state?.mode || null);
    setMessages([]);
    setStatus('active');
    setEndReason(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    if (!socket) return;

    function handleMessage(msg) {
      if (msg.roomId !== roomId) return;
      setMessages((prev) => {
        const next = [...prev, msg];
        return next.length > MAX_MESSAGES_KEPT ? next.slice(-MAX_MESSAGES_KEPT) : next;
      });
    }
    function handleTyping(payload) {
      if (payload.roomId !== roomId || payload.username === username) return;
      setTypingPartner(payload.isTyping);
    }
    function handlePartnerGone(payload) {
      if (payload.roomId !== roomId) return;
      if (payload.requeued) {
        setStatus('requeuing');
      } else {
        setStatus('ended');
        setEndReason(`${partner || 'Your partner'} left the chat.`);
      }
    }
    function handleRoomEnded(payload) {
      if (payload.roomId !== roomId) return;
      setStatus('ended');
      setEndReason(payload.reason || 'This chat has ended.');
    }

    socket.on('new-message', handleMessage);
    socket.on('typing', handleTyping);
    socket.on('partner-disconnected', handlePartnerGone);
    socket.on('partner-left', handlePartnerGone);
    socket.on('room-ended', handleRoomEnded);
    return () => {
      socket.off('new-message', handleMessage);
      socket.off('typing', handleTyping);
      socket.off('partner-disconnected', handlePartnerGone);
      socket.off('partner-left', handlePartnerGone);
      socket.off('room-ended', handleRoomEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId, partner, username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleLeave() {
    await leaveRoom(roomId);
    navigate('/');
  }

  // Refreshing mid-chat loses the in-memory partner/mode context, by
  // design — there's nothing server-side to recover it from either.
  if (!partner && status === 'active') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm rounded-2xl border border-white/10 bg-jet-black p-6 text-center">
          <h2 className="font-display text-base font-semibold text-white">This chat isn't available</h2>
          <p className="mt-1 text-sm text-white/55">
            Private chats only exist while you're connected to them — refreshing or returning later loses the
            session, on purpose.
          </p>
          <Link
            to="/"
            className="mt-4 inline-block rounded-full bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark"
          >
            Back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-white/10 bg-ink-black px-4 py-3">
        <Link to="/" aria-label="Back home" className="rounded-full p-1.5 hover:bg-white/10">
          <ArrowLeft className="size-4 text-white/70" />
        </Link>
        <div className="flex flex-1 items-center gap-2">
          <UserRound className="size-4 text-ocean-mist-light" />
          <div>
            <h1 className="font-display text-sm font-semibold text-white">{partner || 'Partner'}</h1>
            <p className="text-xs text-white/45">{mode === 'direct' ? 'Direct chat' : 'Random partner'}</p>
          </div>
        </div>
        {status === 'active' && (
          <button
            onClick={handleLeave}
            className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/5"
          >
            <LogOut className="size-3.5" /> Leave
          </button>
        )}
      </header>

      <main className="scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && status === 'active' && (
          <p className="pt-10 text-center text-sm text-white/40">You're connected — say hi.</p>
        )}
        {messages.map((msg, i) => (
          <ChatBubble key={`${msg.timestamp}-${i}`} message={msg} isOwn={msg.username === username} />
        ))}
        <div ref={bottomRef} />
      </main>

      {typingPartner && status === 'active' && (
        <p className="px-4 pb-1 text-xs text-white/40">{partner} is typing…</p>
      )}

      {status === 'requeuing' && (
        <div className="flex items-center justify-center gap-2 border-t border-white/10 bg-ink-black px-4 py-4 text-sm text-white/60">
          <Loader2 className="size-4 animate-spin text-ocean-mist-light" />
          {partner} disconnected — finding you a new partner…
        </div>
      )}

      {status === 'ended' && (
        <div className="flex flex-col items-center gap-3 border-t border-white/10 bg-ink-black px-4 py-4 text-center">
          <p className="text-sm text-white/60">{endReason}</p>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 rounded-full bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-dark"
          >
            <Shuffle className="size-3.5" /> Back home
          </button>
        </div>
      )}

      {status === 'active' && <MessageInput roomId={roomId} />}
    </div>
  );
}
