import { useRef, useState } from "react";

export default function MessageInput({ onSend, onTyping, disabled }) {
  const [text, setText] = useState("");
  const typingTimeout = useRef(null);

  function handleChange(e) {
    setText(e.target.value);
    onTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping(false), 1200);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
    clearTimeout(typingTimeout.current);
    onTyping(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-t border-white/10 bg-jet-black px-4 py-3"
    >
      <input
        value={text}
        onChange={handleChange}
        disabled={disabled}
        placeholder={disabled ? "Connecting…" : "Type a message…"}
        maxLength={1000}
        className="flex-1 rounded-full border border-white/10 bg-ink-black px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-ocean-mist focus:ring-2 focus:ring-ocean-mist/40 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="rounded-full bg-royal-blue px-5 py-2.5 text-sm font-medium text-white transition hover:bg-royal-blue/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Send
      </button>
    </form>
  );
}
