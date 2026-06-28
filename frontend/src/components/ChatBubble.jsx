import { Play } from 'lucide-react';

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export default function ChatBubble({ message, isOwn, showAuthor }) {
  const { username, type, content, durationSeconds, timestamp } = message;

  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} animate-message-in`}>
      {showAuthor && !isOwn && <span className="mb-1 px-1 text-xs font-medium text-ocean-mist-light">{username}</span>}

      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
          isOwn ? 'bg-royal-blue text-white rounded-br-md' : 'bg-jet-black text-white rounded-bl-md'
        }`}
      >
        {type === 'text' && <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{content}</p>}

        {type === 'image' && (
          <a href={content} target="_blank" rel="noreferrer" className="block">
            <img
              src={content}
              alt="Shared image"
              loading="lazy"
              className="max-h-72 rounded-lg object-cover"
            />
          </a>
        )}

        {type === 'voice' && (
          <div className="flex items-center gap-2 min-w-48">
            <Play className="size-4 shrink-0 opacity-80" />
            <audio controls src={content} className="h-8 w-full" preload="metadata" />
            {durationSeconds > 0 && (
              <span className="shrink-0 text-xs opacity-70">{formatDuration(durationSeconds)}</span>
            )}
          </div>
        )}
      </div>

      <span className="mt-1 px-1 text-[11px] text-white/40">{formatTime(timestamp)}</span>
    </div>
  );
}
