export default function TypingIndicator({ typingUsers }) {
  if (!typingUsers || typingUsers.length === 0) {
    return <div className="typing-indicator" />;
  }

  const label =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing`
      : `${typingUsers.slice(0, -1).join(', ')} and ${typingUsers[typingUsers.length - 1]} are typing`;

  return (
    <div className="typing-indicator">
      <span className="typing-dots">
        <span />
        <span />
        <span />
      </span>
      {label}
    </div>
  );
}
