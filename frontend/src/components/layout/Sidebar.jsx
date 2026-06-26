import { Hash, Shuffle, X, Users } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { GLOBAL_ROOM } from '../../utils/constants';
import { Avatar, Badge } from '../common/UI';
import UserList from '../users/UserList';

export default function Sidebar({ isOpen, onClose }) {
  const {
    activeView,
    focusView,
    rooms,
    leaveRoom,
    findRandom,
    cancelRandomSearch,
    randomStatus,
    onlineUsers,
  } = useChat();

  const roomList = Object.values(rooms);

  function selectView(view) {
    focusView(view);
    onClose();
  }

  return (
    <>
      <div className={`sidebar-backdrop ${isOpen ? 'is-open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className="sidebar-section">
          <div className="sidebar-section-title">Conversations</div>
          <div className="sidebar-actions">
            <div
              className="user-row"
              style={{
                cursor: 'pointer',
                borderRadius: 'var(--radius-md)',
                background: activeView === GLOBAL_ROOM ? 'var(--bg-surface-active)' : 'transparent',
              }}
              onClick={() => selectView(GLOBAL_ROOM)}
            >
              <div className="avatar avatar-sm" style={{ background: 'var(--accent-primary)' }}>
                <Hash size={14} />
              </div>
              <div className="user-row-info">
                <div className="user-row-name">Group Chat</div>
              </div>
              <Badge variant="online">{onlineUsers.length}</Badge>
            </div>

            {roomList.map((room) => (
              <div
                key={room.id}
                className="user-row"
                style={{
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-md)',
                  background: activeView === room.id ? 'var(--bg-surface-active)' : 'transparent',
                }}
                onClick={() => selectView(room.id)}
              >
                <Avatar name={room.partner} size="sm" online />
                <div className="user-row-info">
                  <div className="user-row-name">{room.partner}</div>
                  <Badge variant={room.type === 'random' ? 'neutral' : 'online'}>{room.type}</Badge>
                </div>
                <button
                  className="icon-btn"
                  title="End this chat"
                  onClick={(e) => {
                    e.stopPropagation();
                    leaveRoom(room.id);
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Random Match</div>
          {randomStatus === 'searching' ? (
            <button className="btn btn-secondary btn-block btn-sm" onClick={cancelRandomSearch}>
              Searching… tap to cancel
            </button>
          ) : (
            <button className="btn btn-accent btn-block btn-sm" onClick={findRandom}>
              <Shuffle size={14} /> Find Random User
            </button>
          )}
        </div>

        <div className="sidebar-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', borderBottom: 'none', minHeight: 0 }}>
          <div className="sidebar-section-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={13} /> Online Users
            </span>
            <span>{onlineUsers.length}</span>
          </div>
          <div className="sidebar-scroll">
            <UserList />
          </div>
        </div>
      </aside>
    </>
  );
}
