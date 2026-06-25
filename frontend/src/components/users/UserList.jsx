import { UserPlus, Check, Clock } from 'lucide-react';
import { Avatar, Badge } from '../common/UI';
import { useChat } from '../../context/ChatContext';

export default function UserList() {
  const { onlineUsers, username, sendPrivateRequest, outgoingRequest, rooms } = useChat();

  const others = onlineUsers.filter((u) => u.username !== username);
  const activePartners = new Set(Object.values(rooms).map((r) => r.partner));

  if (others.length === 0) {
    return <p className="empty-row">No one else is online right now.</p>;
  }

  return (
    <div>
      {others.map((user) => {
        const isPending = outgoingRequest && outgoingRequest.to === user.username;
        const isConnected = activePartners.has(user.username);

        return (
          <div className="user-row" key={user.username}>
            <Avatar name={user.username} size="sm" online />
            <div className="user-row-info">
              <div className="user-row-name">{user.username}</div>
              <Badge variant="online">Online</Badge>
            </div>
            <div className="user-row-actions">
              {isConnected ? (
                <span className="icon-btn" title="Already chatting">
                  <Check size={14} />
                </span>
              ) : isPending ? (
                <span className="icon-btn" title="Request sent">
                  <Clock size={14} />
                </span>
              ) : (
                <button
                  className="icon-btn"
                  title={`Send chat request to ${user.username}`}
                  onClick={() => sendPrivateRequest(user.username)}
                >
                  <UserPlus size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
