import { Check, CheckCheck } from 'lucide-react';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function StatusIcon({ status }) {
  if (status === 'seen') {
    return (
      <span className="message-status is-seen">
        <CheckCheck size={12} /> Seen
      </span>
    );
  }
  if (status === 'delivered') {
    return (
      <span className="message-status">
        <CheckCheck size={12} /> Delivered
      </span>
    );
  }
  return (
    <span className="message-status">
      <Check size={12} /> Sent
    </span>
  );
}

export default function MessageBubble({ message, isOwn, showReceipt, onImageClick }) {
  return (
    <div className={`message-row ${isOwn ? 'is-own' : ''}`}>
      {!isOwn && <div className="message-sender">{message.sender}</div>}

      {message.type === 'image' ? (
        <img
          src={message.content}
          alt="Shared"
          className="message-image"
          loading="lazy"
          onClick={() => onImageClick && onImageClick(message.content)}
        />
      ) : (
        <div className="message-text">{message.content}</div>
      )}

      <div className="message-meta">
        <span>{formatTime(message.timestamp)}</span>
        {showReceipt && isOwn && <StatusIcon status={message.status} />}
      </div>
    </div>
  );
}
