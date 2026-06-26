import { Check, X, MessageCircle } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export default function RequestModal() {
  const { incomingRequests, respondToRequest } = useChat();

  if (incomingRequests.length === 0) return null;

  return (
    <div className="notification-stack is-left">
      {incomingRequests.map((req) => (
        <div className="notification-toast is-request" key={req.requestId}>
          <div className="notification-title">
            <MessageCircle size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
            Chat request
          </div>
          <div className="notification-body">{req.from} wants to start a private chat with you.</div>
          <div className="notification-actions">
            <button className="btn btn-primary btn-sm" onClick={() => respondToRequest(req.requestId, true)}>
              <Check size={13} /> Accept
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => respondToRequest(req.requestId, false)}>
              <X size={13} /> Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
