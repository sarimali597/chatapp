function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ message, isOwn }) {
  if (message.system) {
    return <p className="msg-in text-center text-xs italic text-white/30">{message.text}</p>;
  }

  return (
    <div className={`msg-in flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
      {!isOwn && (
        <span className="mb-1 px-1 text-xs font-medium text-ocean-mist">
          {message.username}
        </span>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm text-white ${
          isOwn
            ? "rounded-tr-sm bg-royal-blue"
            : "rounded-tl-sm border border-white/10 bg-jet-black"
        }`}
      >
        {message.text}
      </div>
      <span className="mt-1 px-1 text-[11px] text-white/30">
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}
