import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

export default function MessageList({ messages, currentUsername, showReceipt, emptyHint }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="chat-empty">
        <h3>No messages yet</h3>
        <p>{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={message.sender === currentUsername}
          showReceipt={showReceipt}
          onImageClick={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
