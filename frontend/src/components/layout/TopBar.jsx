import { Menu, LogOut } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useChat } from '../../context/ChatContext';
import { SignalMark } from '../common/UI';

export default function TopBar({ onToggleSidebar }) {
  const { connected } = useSocket();
  const { username, logout } = useChat();

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <button className="composer-icon-btn sidebar-toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <Menu size={20} />
        </button>
        <SignalMark />
        <span className="topbar-brand-name">
          Chat<span>Flow</span>
        </span>
      </div>

      <div className="topbar-status">
        <span className="topbar-status-dot" style={{ background: connected ? undefined : '#ef4444' }} />
        {connected ? 'Live' : 'Reconnecting…'}
      </div>

      <div className="topbar-user">
        <span className="topbar-username">
          Signed in as <strong>{username}</strong>
        </span>
        <button className="icon-btn" onClick={logout} aria-label="Leave ChatFlow" title="Leave ChatFlow">
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
