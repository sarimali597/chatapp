import { useEffect, useRef, useState } from "react";
import { socket } from "./socket";
import JoinScreen from "./components/JoinScreen";
import ChatHeader from "./components/ChatHeader";
import MessageList from "./components/MessageList";
import MessageInput from "./components/MessageInput";

const STORAGE_KEY = "chatapp-username";

export default function App() {
  const [username, setUsername] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUser, setTypingUser] = useState(null);

  // Kept in a ref so the "connect" handler (registered once) always sees
  // the latest username, even though it's set asynchronously via state.
  const usernameRef = useRef(username);
  const typingClearTimeout = useRef(null);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      if (usernameRef.current) socket.emit("join", usernameRef.current);
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onChatMessage(payload) {
      setMessages((prev) => [...prev, payload]);
    }
    function onUserCount(count) {
      setOnlineCount(count);
    }
    function onTyping(name) {
      setTypingUser(name);
      clearTimeout(typingClearTimeout.current);
      typingClearTimeout.current = setTimeout(() => setTypingUser(null), 2000);
    }
    function onStopTyping() {
      setTypingUser(null);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("chat-message", onChatMessage);
    socket.on("user-count", onUserCount);
    socket.on("typing", onTyping);
    socket.on("stop-typing", onStopTyping);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chat-message", onChatMessage);
      socket.off("user-count", onUserCount);
      socket.off("typing", onTyping);
      socket.off("stop-typing", onStopTyping);
    };
  }, []);

  function handleJoin(name) {
    const trimmed = name.trim().slice(0, 24);
    if (!trimmed) return;
    localStorage.setItem(STORAGE_KEY, trimmed);
    setUsername(trimmed);
    setJoined(true);
    socket.connect();
  }

  function handleSend(text) {
    socket.emit("chat-message", text);
  }

  function handleTyping(isTyping) {
    socket.emit(isTyping ? "typing" : "stop-typing");
  }

  if (!joined) {
    return <JoinScreen onJoin={handleJoin} defaultName={username} />;
  }

  return (
    <div className="flex h-screen flex-col items-center bg-ink-black px-4 py-6 sm:py-10">
      <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-jet-black shadow-2xl">
        <ChatHeader connected={connected} onlineCount={onlineCount} />
        <MessageList messages={messages} username={username} typingUser={typingUser} />
        <MessageInput onSend={handleSend} onTyping={handleTyping} disabled={!connected} />
      </div>
    </div>
  );
}
