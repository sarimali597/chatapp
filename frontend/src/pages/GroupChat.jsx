import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { useSocket } from '../hooks/useSocket.js';
import ChatBubble from '../components/ChatBubble.jsx';
import MessageInput from '../components/MessageInput.jsx';

const ROOM_ID = 'lobby';
const MAX_MESSAGES_KEPT = 500; // memory only — nothing here is ever persisted

export default function GroupChat() {
  const { socket, username, activeUsers } = useSocket();
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    function handleMessage(msg) {
      if (msg.roomId !== ROOM_ID) return;
      setMessages((prev) => {
        const next = [...prev, msg];
        return next.length > MAX_MESSAGES_KEPT ? next.slice(-MAX_MESSAGES_KEPT) : next;
      });
    }

    function handleTyping({ roomId, username: typer, isTyping }) {
      if (roomId !== ROOM_ID) return;
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) next.add(typer);
        else next.delete(typer);
        return next;
      });
    }

    socket.on('new-message', handleMessage);
    socket.on('typing', handleTyping);
    return () => {
      socket.off('new-message', handleMessage);
      socket.off('typing', handleTyping);
    };
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-white/10 bg-ink-black px-4 py-3">
        <Link to="/" aria-label="Back home" className="rounded-full p-1.5 hover:bg-white/10">
          <ArrowLeft className="size-4 text-white/70" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-sm font-semibold text-white">Group chat</h1>
          <p className="flex items-center gap-1 text-xs text-white/50">
            <Users className="size-3" /> {activeUsers.length} online
          </p>
        </div>
      </header>

      <main className="scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="pt-10 text-center text-sm text-white/40">No messages yet — say hi.</p>
        )}
        {messages.map((msg, i) => (
          <ChatBubble
            key={`${msg.timestamp}-${i}`}
            message={msg}
            isOwn={msg.username === username}
            showAuthor
          />
        ))}
        <div ref={bottomRef} />
      </main>

      {typingUsers.size > 0 && (
        <p className="px-4 pb-1 text-xs text-white/40">
          {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing…
        </p>
      )}

      <MessageInput roomId={ROOM_ID} />
    </div>
  );
}
