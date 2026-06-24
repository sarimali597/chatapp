import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";

export default function MessageList({ messages, username, typingUser }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  return (
    <div className="flex-1 space-y-3 overflow-y-auto bg-ink-black px-5 py-4">
      {messages.length === 0 && (
        <p className="mt-10 text-center text-sm text-white/30">No messages yet — say hello.</p>
      )}

      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} isOwn={msg.username === username} />
      ))}

      {typingUser && <TypingIndicator name={typingUser} />}

      <div ref={bottomRef} />
    </div>
  );
}
