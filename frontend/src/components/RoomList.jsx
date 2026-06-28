import { useState } from 'react';
import { UserRound, MessageSquarePlus, Loader2 } from 'lucide-react';
import { useSocket } from '../hooks/useSocket.js';

export default function RoomList() {
  const { activeUsers, username, requestChat } = useSocket();
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);

  const others = activeUsers.filter((u) => u !== username);

  async function handleRequest(targetUsername) {
    setPending(targetUsername);
    setError(null);
    const res = await requestChat(targetUsername);
    if (!res.success) setError(res.error);
    setPending(null);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-jet-black p-5">
      <h3 className="font-display text-base font-semibold text-white">Message someone directly</h3>
      <p className="mt-1 text-sm text-white/55">
        {others.length === 0 ? "No one else is online right now." : "Send a request — they'll get to accept or decline."}
      </p>

      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}

      {others.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5 max-h-64 overflow-y-auto scroll-thin">
          {others.map((user) => (
            <li
              key={user}
              className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-white/5"
            >
              <span className="flex items-center gap-2 text-sm text-white/85">
                <UserRound className="size-4 text-white/40" />
                {user}
              </span>
              <button
                onClick={() => handleRequest(user)}
                disabled={pending === user}
                aria-label={`Send ${user} a chat request`}
                className="flex items-center gap-1 rounded-full bg-royal-blue/15 px-3 py-1.5 text-xs font-medium text-royal-blue-light transition-colors hover:bg-royal-blue/25 disabled:opacity-50"
              >
                {pending === user ? <Loader2 className="size-3.5 animate-spin" /> : <MessageSquarePlus className="size-3.5" />}
                Chat
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
