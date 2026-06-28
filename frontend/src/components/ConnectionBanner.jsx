import { WifiOff, Ban, Loader2, X } from 'lucide-react';
import { useSocket } from '../hooks/useSocket.js';

export default function ConnectionBanner() {
  const { connectionStatus, connectionError, notice, clearNotice } = useSocket();

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex flex-col items-center gap-2 pt-3 px-3 pointer-events-none">
      {connectionStatus === 'connecting' && (
        <Pill tone="neutral">
          <Loader2 className="size-4 animate-spin" />
          Connecting to ChatFlow — first load can take up to a minute if the server was asleep.
        </Pill>
      )}

      {connectionStatus === 'disconnected' && (
        <Pill tone="warning">
          <WifiOff className="size-4" />
          Connection lost — trying to reconnect…
        </Pill>
      )}

      {connectionStatus === 'banned' && (
        <Pill tone="danger">
          <Ban className="size-4" />
          {connectionError}
        </Pill>
      )}

      {notice && (
        <Pill tone={notice.type === 'error' ? 'danger' : 'neutral'} dismissible onDismiss={clearNotice}>
          {notice.message}
        </Pill>
      )}
    </div>
  );
}

function Pill({ tone, children, dismissible, onDismiss }) {
  const tones = {
    neutral: 'bg-jet-black text-white border-white/10',
    warning: 'bg-jet-black text-ocean-mist-light border-ocean-mist/30',
    danger: 'bg-jet-black text-red-300 border-red-500/30',
  };
  return (
    <div
      className={`pointer-events-auto flex items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-lg shadow-black/40 ${tones[tone]}`}
      role="status"
    >
      {children}
      {dismissible && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="ml-1 rounded-full p-0.5 hover:bg-white/10 transition-colors"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
