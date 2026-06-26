import { Hash, Shuffle, LogOut } from 'lucide-react';
import { Avatar, Badge } from '../common/UI';
import { useChat } from '../../context/ChatContext';
import { GLOBAL_ROOM } from '../../utils/constants';

export default function ChatHeader({ room }) {
  const { onlineUsers, leaveRoom, skipRandom } = useChat();

  if (!room) {
    return (
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="avatar avatar-sm" style={{ background: 'var(--accent-primary)' }}>
            <Hash size={14} />
          </div>
          <div>
            <div className="chat-header-title">Group Chat</div>
            <div className="chat-header-subtitle">{onlineUsers.length} online</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-header">
      <div className="chat-header-info">
        <Avatar name={room.partner} online />
        <div>
          <div className="chat-header-title">{room.partner}</div>
          <div className="chat-header-subtitle">
            <Badge variant={room.type === 'random' ? 'neutral' : 'online'}>
              {room.type === 'random' ? 'Random chat' : 'Private chat'}
            </Badge>
          </div>
        </div>
      </div>
      <div className="chat-header-actions">
        {room.type === 'random' && (
          <button className="btn btn-secondary btn-sm" onClick={() => skipRandom(room.id)}>
            <Shuffle size={14} /> Skip
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => leaveRoom(room.id)}>
          <LogOut size={14} /> End Chat
        </button>
      </div>
    </div>
  );
}
