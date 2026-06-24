export default function ChatHeader({ connected, onlineCount }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 bg-jet-black px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-royal-blue font-display text-sm font-bold text-white">
          C
        </div>
        <div>
          <h1 className="font-display text-base font-semibold text-white">ChatApp</h1>
          <p className="text-xs text-white/40">Realtime · Socket.IO</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-full bg-ink-black px-3 py-1.5">
        <span
          className={`h-2 w-2 rounded-full ${
            connected ? "pulse-dot bg-ocean-mist" : "bg-white/30"
          }`}
        />
        <span className="text-xs font-medium text-white/70">
          {connected ? `${onlineCount} online` : "connecting…"}
        </span>
      </div>
    </div>
  );
}
